const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/user');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.rated) return res.status(400).json({ message: 'Already rated' });
    if (booking.customer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const r = await Rating.create({
      booking: bookingId,
      customer: req.user._id,
      professional: booking.professional,
      rating,
      review
    });

    const pro = await User.findById(booking.professional);
    if (pro) {
      pro.ratings.push({ customer: req.user._id, rating, comment: review });
      pro.rating = pro.ratings.reduce((s, r) => s + r.rating, 0) / pro.ratings.length;
      await pro.save();
    }

    booking.rated = true;
    await booking.save();

    await Notification.create({
      user: booking.professional, type: 'booking',
      message: req.user.name + ' gave you a ' + rating + '-star rating. Well done!',
      link: '/my-bookings'
    });

    res.json({ message: 'Rating submitted', rating: r });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

router.get('/:professionalId', async (req, res) => {
  try {
    const ratings = await Rating.find({ professional: req.params.professionalId })
      .populate('customer', 'name profilePhoto')
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get ratings' });
  }
});

module.exports = router;
