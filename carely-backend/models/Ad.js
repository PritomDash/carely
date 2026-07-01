const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
  description: { type: String, required: true },
  start:       { type: Date, required: true },
  end:         { type: Date, required: true },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  mediaType:   { type: String, enum: ['image', 'video'], required: true },
  mediaUrl:    { type: String, required: true },
  placement:   { type: String, enum: ['hero', 'belowFeatures', 'belowScreenshots', 'aboveFooter'], default: 'belowScreenshots' },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Ad', AdSchema);
