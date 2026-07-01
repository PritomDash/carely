const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appliedAt:    { type: Date, default: Date.now },
  status:       { type: String, enum: ['Pending', 'Selected', 'Rejected'], default: 'Pending' }
}, { _id: false });

const jobPostSchema = new mongoose.Schema({
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  serviceType: { type: String, enum: ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'], required: true },
  location: {
    division: { type: String, required: true },
    district: { type: String, required: true },
    thana:    { type: String, required: true }
  },
  schedule: {
    startDate:     Date,
    endDate:       Date,
    preferredDays: [String],
    preferredTime: String
  },
  bookingType: { type: String, enum: ['short', 'long'] },
  budgetBDT:   { type: Number },
  isEmergency: { type: Boolean, default: false },
  status: { type: String, enum: ['Open', 'InProgress', 'Completed', 'Expired', 'Cancelled'], default: 'Open' },
  expiresAt:   { type: Date },
  selectedPro: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  applicants:  [applicantSchema],
}, { timestamps: true });

jobPostSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

jobPostSchema.index({ status: 1, expiresAt: 1 });
jobPostSchema.index({ 'location.thana': 1, serviceType: 1 });

module.exports = mongoose.model('JobPost', jobPostSchema);
