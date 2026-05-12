const mongoose = require('mongoose');


const slotReservationSchema = new mongoose.Schema({
  expertId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Expert', required: true },
  slotId:    { type: String, required: true },
  date:      { type: String, required: true },
  startTime: { type: String, required: true },
  sessionId: { type: String, required: true }, 
  expiresAt: { type: Date, required: true },
});


slotReservationSchema.index({ expertId: 1, slotId: 1 }, { unique: true });


slotReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SlotReservation', slotReservationSchema);
