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
      { tier: 'basic',   days: 7,  priceBDT: 150, label: '7 Days Boost' },
      { tier: 'premium', days: 30, priceBDT: 500, label: '30 Days Boost' },
    ]
  },
  // How many minutes boosted professionals get to see a new job post before
  // everyone else. Read by the delayed-notification cron in cronJobs.js -
  // never hardcode this elsewhere.
  boostNotificationDelayMinutes: { type: Number, default: 15 },
  subscriptionEnabled:    { type: Boolean, default: false },

  // God Mode admin controls
  registrationsPaused: { type: Boolean, default: false },
  maintenanceMode:     { type: Boolean, default: false },
  maintenanceMessage:  { type: String, default: 'Carely is currently undergoing scheduled maintenance. Please check back soon.' },
  commissionRate:   { type: Number, default: 15 },
  emergencyPostFee: { type: Number, default: 75 },

  // Credit settings - as of the monetization rewrite, credits are a
  // customer-only mechanic paid solely for Emergency job posts.
  // Professionals never spend credits for anything (accepting bookings and
  // being selected from job posts are both always free - see
  // bookingRoutes.js accept and jobPostRoutes.js select, which no longer
  // contain any credit check at all).
  freeCreditsEnabled:      { type: Boolean, default: true },
  freeCreditsAmount:       { type: Number, default: 0 },
  customerFreeCredits:     { type: Number, default: 10 },
  bookingAcceptCreditCost: { type: Number, default: 0 },
  jobSelectCreditCost:     { type: Number, default: 0 },
  emergencyPostCreditCost: { type: Number, default: 3 },

  // Credit packs
  creditPacks: {
    type: [creditPackSchema],
    default: [
      { credits: 15, priceBDT: 200, label: '15 Credits', popular: false },
      { credits: 40, priceBDT: 500, label: '40 Credits', popular: true },
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
