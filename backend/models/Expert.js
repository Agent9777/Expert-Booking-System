const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  date: { type: String, required: true }, 
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
});

const expertSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Technology', 'Finance', 'Health', 'Legal', 'Marketing', 'Design', 'Business', 'Education'],
    },
    experience: { type: Number, required: true, min: 0 },
    rating: { type: Number, required: true, min: 0, max: 5 },
    bio: { type: String, required: true },
    avatar: { type: String, default: '' },
    hourlyRate: { type: Number, required: true },
    availableSlots: [timeSlotSchema],
    totalReviews: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

expertSchema.index({ name: 'text', bio: 'text' });
expertSchema.index({ category: 1 });

module.exports = mongoose.model('Expert', expertSchema);
