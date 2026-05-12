const mongoose = require('mongoose');

// TTL index on `expiresAt` — MongoDB auto-deletes expired reservations
const slotReservationSchema = new mongoose.Schema({
  expertId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Expert', required: true },
  slotId:    { type: String, required: true },
  date:      { type: String, required: true },
  startTime: { type: String, required: true },
  sessionId: { type: String, required: true }, // random client token
  expiresAt: { type: Date, required: true },
});

// Compound unique: only ONE active reservation per slot at a time
slotReservationSchema.index({ expertId: 1, slotId: 1 }, { unique: true });

// MongoDB TTL index — auto-deletes documents when expiresAt is reached
slotReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SlotReservation', slotReservationSchema);
