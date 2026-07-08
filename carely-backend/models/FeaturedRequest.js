const mongoose = require('mongoose');

const featuredRequestSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tier:            { type: String, enum: ['basic', 'premium'], required: true },
  days:            { type: Number, required: true },
  amountBDT:       { type: Number, required: true },
  method:          { type: String, enum: ['bkash', 'nagad', 'shurjopay', 'sslcommerz'], default: 'bkash' },
  transactionID:   { type: String },
  senderNumber:    { type: String },
  status:          { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:      { type: Date },
  rejectedReason:  { type: String },
  autoVerified:    { type: Boolean, default: false },
  gatewayOrderId:  { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FeaturedRequest', featuredRequestSchema);
