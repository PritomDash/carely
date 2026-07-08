const mongoose = require('mongoose');

const creditPackSchema = new mongoose.Schema({
  credits: Number,
  priceBDT: Number,
  label: String,
  popular: Boolean,
}, { _id: false });

const featuredPackSchema = new mongoose.Schema({
  tier: String,
  days: Number,
  priceBDT: Number,
  label: String,
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  creditsEnabled:         { type: Boolean, default: false },
  emergencyPostEnabled:   { type: Boolean, default: false },
  cashPaymentEnabled:     { type: Boolean, default: false },
  featuredListingEnabled: { type: Boolean, default: true },
  featuredPacks: {
    type: [featuredPackSchema],
    default: [
      { tier: 'basic',   days: 7,  priceBDT: 200, label: '7 Days Boost' },
      { tier: 'premium', days: 30, priceBDT: 600, label: '30 Days Featured' },
    ]
  },
  subscriptionEnabled:    { type: Boolean, default: false },

  // God Mode admin controls
  registrationsPaused: { type: Boolean, default: false },
  maintenanceMode:     { type: Boolean, default: false },
  maintenanceMessage:  { type: String, default: 'Carely is currently undergoing scheduled maintenance. Please check back soon.' },
  commissionRate:   { type: Number, default: 15 },
  emergencyPostFee: { type: Number, default: 75 },

  // Credit settings
  freeCreditsEnabled:      { type: Boolean, default: true },
  freeCreditsAmount:       { type: Number, default: 500 },
  customerFreeCredits:     { type: Number, default: 10 },
  bookingAcceptCreditCost: { type: Number, default: 1 },
  jobSelectCreditCost:     { type: Number, default: 1 },
  emergencyPostCreditCost: { type: Number, default: 1 },

  // Credit packs
  creditPacks: {
    type: [creditPackSchema],
    default: [
      { credits: 50,  priceBDT: 200,  label: '50 credits',  popular: false },
      { credits: 150, priceBDT: 500,  label: '150 credits', popular: true  },
      { credits: 400, priceBDT: 1200, label: '400 credits', popular: false },
    ]
  },

  // Manual top up (always available)
  manualTopUpEnabled: { type: Boolean, default: true },
  platformBkash: { type: String, default: '' },
  platformNagad: { type: String, default: '' },

  // Payment gateway (disabled until merchant account ready)
  paymentGatewayEnabled:  { type: Boolean, default: false },
  paymentGatewayProvider: { type: String, enum: ['shurjopay', 'sslcommerz', 'none'], default: 'none' },

  // ShurjoPay credentials (empty until merchant account)
  shurjopayUsername:     { type: String, default: '' },
  shurjopayPassword:     { type: String, default: '' },
  shurjopayClientId:     { type: String, default: '' },
  shurjopayClientSecret: { type: String, default: '' },
  shurjopayBaseUrl:      { type: String, default: 'https://sandbox.shurjopayment.com' },

  // SSLCommerz credentials (empty until merchant account)
  sslcommerzStoreId:  { type: String, default: '' },
  sslcommerzPassword: { type: String, default: '' },
  sslcommerzSandbox:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
