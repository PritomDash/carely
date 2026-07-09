const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AvailabilitySchema = new mongoose.Schema({
  Monday:    { start: String, end: String },
  Tuesday:   { start: String, end: String },
  Wednesday: { start: String, end: String },
  Thursday:  { start: String, end: String },
  Friday:    { start: String, end: String },
  Saturday:  { start: String, end: String },
  Sunday:    { start: String, end: String },
}, { _id: false });

const RatingSchema = new mongoose.Schema({
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['customer', 'professional', 'admin'], required: true },
  name:     { type: String, required: true, trim: true },
  email:    { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone:    { type: String, required: true },
  isVerified:      { type: Boolean, default: true },
  profileApproved: { type: Boolean, default: true },
  professionalType: { type: String, enum: ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'] },
  experience:   { type: String },
  profilePhoto: { type: String },
  introVideo:   { type: String },
  about:        { type: String },
  location: { division: String, district: String, thana: String, area: String },
  nidNumber:         { type: String },
  idDocument:        { type: String },
  passport:          { type: String },
  policeClearance:   { type: String },
  studentID:         { type: String },
  courseCertificate: { type: String },
  documentUploadedAt: { type: Date, default: null },
  bmdc:              { type: String },
  bnmc:              { type: String },
  hourlyRate:   { type: Number, default: 0 },
  weekdayRate:  { type: Number, default: 0 },
  saturdayRate: { type: Number, default: 0 },
  sundayRate:   { type: Number, default: 0 },
  availability: { type: AvailabilitySchema, default: {} },
  ratings: [RatingSchema],
  rating:  { type: Number, default: 0 },
  credits:              { type: Number, default: 0 },
  totalCreditsUsed:     { type: Number, default: 0 },
  totalCreditsReceived: { type: Number, default: 0 },
  bkashNumber:  { type: String },
  nagadNumber:  { type: String },
  payoutMethod: { type: String, enum: ['bkash', 'nagad', 'bank', null], default: null },
  bankDetails: { accountName: String, accountNumber: String, bankName: String, branchName: String, routingNumber: String },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resetPasswordToken:   String,
  resetPasswordExpires: Date,
  referralCode:  { type: String, unique: true, sparse: true },
  referralCount: { type: Number, default: 0 },
  referralScore: { type: Number, default: 0 },
  referredBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isFeatured:    { type: Boolean, default: false },
  featuredUntil: { type: Date, default: null },
  featuredTier:  { type: String, enum: ['none', 'basic', 'premium'], default: 'none' },
  pushSubscription: { type: Object, default: null },
}, { timestamps: true });

userSchema.index({ role: 1, 'location.thana': 1, professionalType: 1 });
userSchema.index({ 'location.district': 1 });

userSchema.virtual('hasRequiredDoc').get(function () {
  return !!(this.idDocument || this.passport);
});

userSchema.pre('save', function (next) {
  const base = typeof this.hourlyRate === 'number' ? this.hourlyRate : 0;
  if (this.weekdayRate  == null) this.weekdayRate  = base;
  if (this.saturdayRate == null) this.saturdayRate = base;
  if (this.sundayRate   == null) this.sundayRate   = base;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
