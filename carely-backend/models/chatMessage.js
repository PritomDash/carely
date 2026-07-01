const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  message:   { type: String, required: true },
  sentAt:    { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
