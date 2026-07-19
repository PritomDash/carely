const { sendPushNotification } = require('./pushNotification');
const User = require('../models/user');
const Notification = require('../models/Notification');

const createNotification = async ({ userId, type, message, link, io, pushTitle }) => {
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

    const user = await User.findById(userId).select('pushSubscription');
    if (user?.pushSubscription) {
      await sendPushNotification({
        subscription: user.pushSubscription,
        title: pushTitle || 'Carely',
        body: message,
        link: link || '/my-bookings'
      });
    }

    return notification;
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

module.exports = { createNotification };
