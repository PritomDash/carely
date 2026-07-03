const mongoose = require('mongoose');

const topUpRequestSchema = new mongoose.Schema({
  user:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  credits:            { type: Number, required: true },
  amountBDT:          { type: Number, required: true },
  paymentMethod:      { type: String, enum: ['bkash','nagad','shurjopay','sslcommerz'], default: 'bkash' },
  transactionID:      { type: String },
  senderNumber:       { type: String },
  status:             { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' },
  approvedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:         { type: Date },
  rejectedReason:     { type: String },
  autoVerified:       { type: Boolean, default: false },
  gatewayOrderId:     { type: String },
  gatewayResponse:    { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('TopUpRequest', topUpRequestSchema);
