const mongoose = require('mongoose');

const SiteAssetSchema = new mongoose.Schema({
  kind:   { type: String, enum: ['logo', 'screenshot'], required: true },
  title:  { type: String, default: '' },
  url:    { type: String, required: true },
  order:  { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('SiteAsset', SiteAssetSchema);
