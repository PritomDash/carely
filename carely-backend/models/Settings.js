const mongoose = require('mongoose');

const creditPackSchema = new mongoose.Schema({
  credits: Number, price: Number, label: String
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  creditsEnabled:         { type: Boolean, default: false },
  emergencyPostEnabled:   { type: Boolean, default: false },
  cashPaymentEnabled:     { type: Boolean, default: false },
  paymentGatewayEnabled:  { type: Boolean, default: false },
  featuredListingEnabled: { type: Boolean, default: false },
  subscriptionEnabled:    { type: Boolean, default: false },
  commissionRate:   { type: Number, default: 15 },
  emergencyPostFee: { type: Number, default: 75 },
  creditPacks: {
    type: [creditPackSchema],
    default: [
      { credits: 10, price: 500,  label: '10 credits - 500 BDT' },
      { credits: 20, price: 900,  label: '20 credits - 900 BDT' },
      { credits: 50, price: 2000, label: '50 credits - 2000 BDT' },
    ]
  },
  platformBkash: { type: String, default: '' },
  platformNagad: { type: String, default: '' },
  sslcommerzStoreId:  { type: String, default: '' },
  sslcommerzPassword: { type: String, default: '' },
  sslcommerzSandbox:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
