const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, enum: ['booking', 'chat', 'payment', 'admin', 'reminder', 'jobpost', 'dispute'], required: true },
  message: { type: String, required: true },
  link:    { type: String },
  isRead:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
