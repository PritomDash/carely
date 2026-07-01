const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Chat = require('../models/chatMessage');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const User = require('../models/user');
const anyAuth = require('../middlewares/anyAuthMiddleware');
const adminAuth = require('../middlewares/adminAuthMiddleware');

// Send message - only allowed within a confirmed booking
router.post('/send', anyAuth, async (req, res) => {
  try {
    const { recipient, message, bookingId } = req.body;
    const sender = req.user._id;

    if (!recipient || !message?.trim())
      return res.status(400).json({ error: 'Recipient and message required' });

    // If bookingId provided, verify it is confirmed and involves both parties
    if (bookingId) {
      const booking = await Booking.findOne({
        _id: bookingId,
        status: 'Confirmed',
        $or: [{ customer: sender }, { professional: sender }]
      });
      if (!booking)
        return res.status(403).json({ error: 'No confirmed booking found for this conversation' });
    }

    const saved = await Chat.create({ sender, recipient, bookingId: bookingId || undefined, message });

    await Notification.create({
      user: recipient, type: 'chat',
      message: 'New message from ' + (req.user.name || 'someone'),
      link: '/chat-inbox'
    });

    if (req.io) {
      const room = [String(sender), String(recipient)].sort().join('_');
      req.io.to(room).emit('receiveMessage', saved);
      req.io.to(String(recipient)).emit('newNotification', {
        type: 'chat',
        message: 'New message from ' + (req.user.name || 'someone'),
      });
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a booking
router.get('/booking/:bookingId', anyAuth, async (req, res) => {
  try {
    const messages = await Chat.find({ bookingId: req.params.bookingId })
      .populate('sender', 'name profilePhoto')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent conversations
router.get('/recent', anyAuth, async (req, res) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user._id);
    const recent = await Chat.aggregate([
      { $match: { $or: [{ sender: me }, { recipient: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: { $cond: [{ $eq: ['$sender', me] }, '$recipient', '$sender'] },
        latestMessage: { $first: '$$ROOT' }
      }},
      { $replaceRoot: { newRoot: '$latestMessage' } },
      { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'senderDetails' } },
      { $lookup: { from: 'users', localField: 'recipient', foreignField: '_id', as: 'recipientDetails' } },
      { $unwind: { path: '$senderDetails', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$recipientDetails', preserveNullAndEmptyArrays: true } },
    ]);
    res.json(recent);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Thread between two users
router.get('/:otherUserId', anyAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const peer = req.params.otherUserId;
    const messages = await Chat.find({
      $or: [
        { sender: me, recipient: peer },
        { sender: peer, recipient: me }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin chat users list
router.get('/admin/chat-users', adminAuth, async (req, res) => {
  try {
    const adminIds = await User.find({ role: 'admin' }).distinct('_id');
    const chats = await Chat.find({
      $or: [{ sender: { $in: adminIds } }, { recipient: { $in: adminIds } }]
    }).populate('sender recipient', 'name email role').lean();

    const unique = {};
    for (const chat of chats) {
      if (!chat?.sender || !chat?.recipient) continue;
      const senderIsAdmin = adminIds.some(id => String(id) === String(chat.sender._id));
      const peer = senderIsAdmin ? chat.recipient : chat.sender;
      if (!peer?._id || peer.role === 'admin') continue;
      unique[String(peer._id)] = peer;
    }
    res.json(Object.values(unique));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat users' });
  }
});

// Admin send message to user
router.post('/admin/send', adminAuth, async (req, res) => {
  try {
    const { recipient, message } = req.body;
    const saved = await Chat.create({ sender: req.admin._id, recipient, message });
    if (req.io) req.io.to(String(recipient)).emit('receiveMessage', saved);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send' });
  }
});

module.exports = router;
