const express = require('express');
const router = express.Router();
const Chat = require('../models/chatMessage');
const User = require('../models/user');
const adminAuth = require('../middlewares/adminAuthMiddleware');

router.get('/chat-users', adminAuth, async (req, res) => {
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

router.get('/messages/:userId', adminAuth, async (req, res) => {
  try {
    const messages = await Chat.find({
      $or: [
        { sender: req.params.userId, recipient: req.admin._id },
        { sender: req.admin._id, recipient: req.params.userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/send', adminAuth, async (req, res) => {
  try {
    const { recipient, message } = req.body;
    const saved = await Chat.create({ sender: req.admin._id, recipient, message });
    if (req.io) req.io.to(String(recipient)).emit('receiveMessage', saved);
    res.json({ success: true, message: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send' });
  }
});

module.exports = router;
