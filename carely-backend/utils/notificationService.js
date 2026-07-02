const Notification = require('../models/Notification');

const createNotification = async ({ userId, type, message, link, io }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type: type || 'booking',
      message,
      link: link || '/my-bookings'
    });

    if (io) {
      io.to(String(userId)).emit('newNotification', {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        isRead: false,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

module.exports = { createNotification };
