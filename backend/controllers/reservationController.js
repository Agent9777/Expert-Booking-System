const mongoose = require('mongoose');
const SlotReservation = require('../models/SlotReservation');
const Expert = require('../models/Expert');

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// POST /api/reservations/lock
// Called the moment user lands on the booking page
const lockSlot = async (req, res) => {
  const { expertId, slotId, date, startTime, sessionId } = req.body;

  if (!expertId || !slotId || !date || !startTime || !sessionId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // 1. Confirm the slot exists and is not already permanently booked
    const expert = await Expert.findOne({
      _id: expertId,
      availableSlots: { $elemMatch: { _id: slotId, isBooked: false } },
    });

    if (!expert) {
      return res.status(409).json({
        success: false,
        message: 'This slot is already booked and is no longer available.',
      });
    }

    const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

    // 2. Atomically insert a reservation — fails if one already exists (unique index)
    try {
      const reservation = await SlotReservation.findOneAndUpdate(
        { expertId, slotId },
        { expertId, slotId, date, startTime, sessionId, expiresAt },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // If a different session holds the lock, reject
      if (reservation.sessionId !== sessionId) {
        const secondsLeft = Math.ceil((reservation.expiresAt - Date.now()) / 1000);
        return res.status(409).json({
          success: false,
          message: `This slot is temporarily reserved by another user. Try again in ${secondsLeft}s.`,
        });
      }

      // 3. Broadcast to expert room so others see it as "Reserved"
      req.io.to(`expert-${expertId}`).emit('slot-reserved', {
        expertId, slotId, date, startTime,
        expiresAt: expiresAt.toISOString(),
        byCurrentUser: false, // other clients show as locked
      });

      return res.status(200).json({
        success: true,
        message: 'Slot locked for 5 minutes',
        expiresAt: expiresAt.toISOString(),
        sessionId,
      });
    } catch (err) {
      // Duplicate key = race condition, someone just took it
      if (err.code === 11000) {
        const existing = await SlotReservation.findOne({ expertId, slotId });
        const secondsLeft = existing
          ? Math.max(0, Math.ceil((new Date(existing.expiresAt) - Date.now()) / 1000))
          : 0;
        return res.status(409).json({
          success: false,
          message: `This slot was just reserved by someone else. Try again in ${secondsLeft}s.`,
        });
      }
      throw err;
    }
  } catch (error) {
    console.error('lockSlot error:', error);
    res.status(500).json({ success: false, message: 'Failed to lock slot. Please try again.' });
  }
};

// DELETE /api/reservations/release
// Called when user leaves the booking page without submitting
const releaseSlot = async (req, res) => {
  const { expertId, slotId, sessionId } = req.body;

  if (!expertId || !slotId || !sessionId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Only the owner of the reservation can release it
    const deleted = await SlotReservation.findOneAndDelete({ expertId, slotId, sessionId });

    if (deleted) {
      req.io.to(`expert-${expertId}`).emit('slot-released', {
        expertId, slotId,
        date: deleted.date,
        startTime: deleted.startTime,
      });
    }

    res.json({ success: true, message: 'Slot reservation released' });
  } catch (error) {
    console.error('releaseSlot error:', error);
    res.status(500).json({ success: false, message: 'Failed to release slot' });
  }
};

// GET /api/reservations/:expertId — get all active reservations for an expert
// Used by detail page to mark reserved slots
const getReservations = async (req, res) => {
  try {
    const reservations = await SlotReservation.find({
      expertId: req.params.expertId,
      expiresAt: { $gt: new Date() },
    }).lean();

    res.json({ success: true, data: reservations });
  } catch (error) {
    console.error('getReservations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
  }
};

module.exports = { lockSlot, releaseSlot, getReservations };
