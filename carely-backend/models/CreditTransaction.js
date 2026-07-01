const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:         { type: String, enum: ['bonus', 'deduct', 'purchase', 'refund'], required: true },
  credits:      { type: Number, required: true },
  note:         { type: String },
  addedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  jobPostId:    { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' },
}, { timestamps: true });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
