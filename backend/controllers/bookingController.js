const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Expert = require('../models/Expert');
const SlotReservation = require('../models/SlotReservation');

// POST /api/bookings — with race-condition-safe double-booking prevention
const createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { expertId, slotId, clientName, clientEmail, clientPhone, date, startTime, notes, sessionId } = req.body;

    // Step 0: Verify this client holds the reservation lock
    if (sessionId) {
      const reservation = await SlotReservation.findOne({ expertId, slotId });
      if (!reservation) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'Your reservation has expired. Please go back and select the slot again.',
        });
      }
      if (reservation.sessionId !== sessionId) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'This slot is reserved by another user.',
        });
      }
    }

    // Step 1: Lock the expert document and check the slot atomically
    const expert = await Expert.findOneAndUpdate(
      {
        _id: expertId,
        'availableSlots._id': slotId,
        'availableSlots.isBooked': false,
        'availableSlots.date': date,
        'availableSlots.startTime': startTime,
      },
      {
        $set: {
          'availableSlots.$.isBooked': true,
        },
      },
      { new: true, session }
    );

    if (!expert) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available. Please choose another slot.',
      });
    }

    // Find the updated slot to get endTime
    const bookedSlot = expert.availableSlots.find((s) => s._id.toString() === slotId);

    // Step 2: Create booking record
    const booking = new Booking({
      expertId,
      expertName: expert.name,
      slotId,
      clientName,
      clientEmail,
      clientPhone,
      date,
      startTime,
      endTime: bookedSlot.endTime,
      notes: notes || '',
      status: 'Pending',
    });

    await booking.save({ session });

    // Step 3: Store bookingId on the slot
    await Expert.updateOne(
      { _id: expertId, 'availableSlots._id': slotId },
      { $set: { 'availableSlots.$.bookingId': booking._id } },
      { session }
    );

    await session.commitTransaction();

    // Step 4: Clean up the reservation lock (outside transaction is fine)
    await SlotReservation.deleteOne({ expertId, slotId }).catch(() => {});

    // Emit real-time update to all clients viewing this expert
    req.io.to(`expert-${expertId}`).emit('slot-booked', {
      expertId,
      slotId,
      date,
      startTime,
      endTime: bookedSlot.endTime,
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      data: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('createBooking error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This time slot was just booked by someone else. Please choose another slot.',
      });
    }

    res.status(500).json({ success: false, message: 'Failed to create booking. Please try again.' });
  } finally {
    session.endSession();
  }
};

// GET /api/bookings?email=
const getBookingsByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const bookings = await Booking.find({ clientEmail: email.toLowerCase().trim() })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error('getBookingsByEmail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

// PATCH /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // If cancelled, free up the slot
    if (status === 'Cancelled') {
      await Expert.updateOne(
        { _id: booking.expertId, 'availableSlots._id': booking.slotId },
        {
          $set: {
            'availableSlots.$.isBooked': false,
            'availableSlots.$.bookingId': null,
          },
        }
      );

      req.io.to(`expert-${booking.expertId}`).emit('slot-released', {
        expertId: booking.expertId.toString(),
        slotId: booking.slotId,
        date: booking.date,
        startTime: booking.startTime,
      });
    }

    res.json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    res.status(500).json({ success: false, message: 'Failed to update booking status' });
  }
};

module.exports = { createBooking, getBookingsByEmail, updateBookingStatus };
