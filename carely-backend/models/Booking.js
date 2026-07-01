const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  date:      { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime:   { type: String, required: true },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:            { type: Date, required: true },
  time:            { type: String, required: true },
  address:         { type: String, required: true },
  workDescription: { type: String, required: true },
  type:            { type: String, enum: ['short', 'long'], required: true },
  recurringDays:   { type: [String], default: [] },
  duration:        { type: Number, default: 1 },
  hourlyRate: { type: Number },
  amount:     { type: Number, required: true },
  proNet:     { type: Number },
  status: {
    type: String,
    enum: ['AwaitingAcceptance', 'Confirmed', 'Completed', 'Cancelled', 'Declined', 'Auto-Declined'],
    default: 'AwaitingAcceptance'
  },
  sessions: { type: [SessionSchema], default: [] },
  isActive: { type: Boolean, default: false },
  rated: { type: Boolean, default: false },
}, { timestamps: true });

bookingSchema.index({ professional: 1, 'sessions.date': 1, isActive: 1, status: 1 });
bookingSchema.index({ customer: 1, status: 1 });

bookingSchema.pre('save', async function (next) {
  if ((this.isModified('amount') || this.proNet == null) && this.amount != null) {
    try {
      const Settings = require('./Settings');
      const settings = await Settings.findOne();
      const rate = settings?.commissionRate ?? 15;
      this.proNet = Math.round(this.amount * (1 - rate / 100) * 100) / 100;
    } catch (e) {}
  }
  next();
});

bookingSchema.set('toJSON',   { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

bookingSchema.virtual('durationMinutes').get(function () {
  return Math.round((this.duration || 0) * 60);
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
