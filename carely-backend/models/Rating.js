const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:       { type: Number, min: 1, max: 5, required: true },
  review:       { type: String, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
