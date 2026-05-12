const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expert',
      required: true,
    },
    expertName: { type: String, required: true },
    slotId: { type: String, required: true }, 
    clientName: { type: String, required: true, trim: true },
    clientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    clientPhone: {
      type: String,
      required: true,
      match: [/^[0-9+\-\s()]{7,15}$/, 'Please enter a valid phone number'],
    },
    date: { type: String, required: true }, 
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    notes: { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

bookingSchema.index({ expertId: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);
