const express = require('express');
const router = express.Router();
const JobPost = require('../models/JobPost');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/user');
const Settings = require('../models/Settings');
const CreditTransaction = require('../models/CreditTransaction');
const authMiddleware = require('../middlewares/authMiddleware');
const { getAppliedRate, computeProNet } = require('../utils/pricing');
const { fireEmail, detailRow } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationService');
const { ymd, dateAtNoonUTC, dayBoundsUTC, getEndTime, DAYS_MAP } = require('../utils/bookingHelpers');

// Customer creates job post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, serviceType, location, schedule, bookingType, budgetBDT, isEmergency } = req.body;
    const settings = await Settings.findOne();

    // Emergency posts require emergencyPostEnabled
    if (isEmergency && !settings?.emergencyPostEnabled) {
      return res.status(400).json({ message: 'Emergency posts are not currently available' });
    }

    const emergencyCost = settings?.emergencyPostCreditCost ?? 1;
    let customer;
    if (isEmergency) {
      customer = await User.findById(req.user._id);
      if (customer.credits < emergencyCost) {
        return res.status(403).json({
          message: 'You do not have enough credits to post an emergency job. Please top up your credits.',
          currentCredits: customer.credits,
        });
      }
    }

    const post = await JobPost.create({
      customer: req.user._id,
      title, description, serviceType, location, schedule,
      bookingType, budgetBDT,
      isEmergency: !!isEmergency
    });

    if (isEmergency) {
      customer.credits -= emergencyCost;
      customer.totalCreditsUsed = (customer.totalCreditsUsed || 0) + emergencyCost;
      await customer.save();
      await CreditTransaction.create({
        professional: customer._id, type: 'deduct', credits: emergencyCost,
        note: 'Emergency post: ' + title,
        jobPostId: post._id,
      });
      console.log('Credit deducted:', customer.email, 'new balance:', customer.credits);
    }

    if (isEmergency && req.io) {
      const pros = await User.find({
        role: 'professional',
        isVerified: true,
        professionalType: serviceType,
        'location.division': location?.division
      }).select('_id');

      for (const pro of pros) {
        await Notification.create({
          user: pro._id, type: 'jobpost',
          message: 'URGENT: ' + title + ' - ' + (location?.thana || '') + ', ' + (location?.district || ''),
          link: '/job-posts/' + post._id
        });
        req.io.to(String(pro._id)).emit('newNotification', {
          type: 'emergency', message: 'URGENT job post in your area'
        });
      }
    }

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
});

// Professionals browse open posts - ALL open posts visible to ALL professionals.
// Type/location filtering happens on the frontend only, as optional filters.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'professional' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only professionals can browse job posts' });
    }

    const posts = await JobPost.find({
      status: 'Open',
      expiresAt: { $gt: new Date() }
    })
      .populate('customer', 'name location')
      .sort({ isEmergency: -1, createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load job posts' });
  }
});

// Customer views their own posts
router.get('/my-posts', authMiddleware, async (req, res) => {
  try {
    const posts = await JobPost.find({ customer: req.user._id })
      .populate('applicants.professional', 'name profilePhoto rating location professionalType')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your posts' });
  }
});

// Single post detail
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await JobPost.findById(req.params.id)
      .populate('customer', 'name location')
      .populate('applicants.professional', 'name profilePhoto rating location professionalType experience');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get post' });
  }
});

// Professional applies (FREE - no credit deducted here)
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professional')
      return res.status(403).json({ message: 'Only professionals can apply' });

    const post = await JobPost.findById(req.params.id);
    if (!post || post.status !== 'Open')
      return res.status(400).json({ message: 'Post is not available' });

    const alreadyApplied = post.applicants.some(
      a => a.professional.toString() === req.user._id.toString()
    );
    if (alreadyApplied)
      return res.status(400).json({ message: 'Already applied' });

    post.applicants.push({ professional: req.user._id });
    await post.save();

    await Notification.create({
      user: post.customer, type: 'jobpost',
      message: req.user.name + ' is interested in your job post: ' + post.title,
      link: '/my-posts'
    });

    res.json({ message: 'Applied successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply' });
  }
});

// Customer selects a professional - deducts a credit AND creates a real
// Confirmed booking (with sessions, so the calendar/chat/emails all behave
// exactly like accepting a direct booking request does).
router.post('/:id/select/:proId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer')
      return res.status(403).json({ message: 'Only customers can select' });

    const post = await JobPost.findById(req.params.id);
    if (!post || post.customer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    if (post.status !== 'Open')
      return res.status(400).json({ message: 'This job post is no longer open' });

    const settings = await Settings.findOne();
    const cost = settings?.jobSelectCreditCost ?? 1;

    const pro = await User.findById(req.params.proId);
    if (!pro) return res.status(404).json({ message: 'Professional not found' });
    if (!pro.isVerified) return res.status(400).json({ message: 'Professional is not verified' });

    if ((pro.credits || 0) < cost) {
      await Notification.create({
        user: pro._id, type: 'jobpost',
        message: 'You were selected for "' + post.title + '" but have insufficient credits. Top up within 24h to confirm.',
        link: '/my-credits'
      });
      return res.status(400).json({ message: 'Professional has insufficient credits. They have been notified to top up.' });
    }

    // Job posts don't collect an exact slot the way direct bookings do -
    // derive a bookable date/time/duration from the post's own schedule.
    const type = post.bookingType === 'long' ? 'long' : 'short';
    const recurringDays = post.schedule?.preferredDays || [];
    const time = post.schedule?.preferredTime || '10:00';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let bookingDate = post.schedule?.startDate ? new Date(post.schedule.startDate) : new Date();
    if (bookingDate < todayStart) {
      bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);
    }

    const rate = getAppliedRate(bookingDate.toISOString().slice(0, 10), pro) || 0;
    const duration = post.budgetBDT && rate > 0
      ? Math.max(1, Math.round(post.budgetBDT / rate))
      : 2;

    let sessions = [];
    if (type === 'long') {
      const selected = recurringDays.map((dv) => DAYS_MAP[String(dv).toLowerCase().trim()]).filter((n) => n !== undefined);
      for (let i = 0; i < 28; i++) {
        const cur = new Date(bookingDate);
        cur.setDate(cur.getDate() + i);
        if (selected.includes(cur.getDay())) {
          sessions.push({ date: dateAtNoonUTC(cur), startTime: time, endTime: getEndTime(time, duration) });
        }
      }
    }
    if (sessions.length === 0) {
      sessions.push({ date: dateAtNoonUTC(bookingDate), startTime: time, endTime: getEndTime(time, duration) });
    }

    // Same conflict safety net as accepting a direct booking request.
    for (const s of sessions) {
      const { start: dayStart, end: dayEnd } = dayBoundsUTC(ymd(s.date));
      const conflict = await Booking.findOne({
        professional: pro._id,
        isActive: true,
        status: 'Confirmed',
        sessions: {
          $elemMatch: {
            date: { $gte: dayStart, $lte: dayEnd },
            startTime: { $lt: s.endTime },
            endTime: { $gt: s.startTime },
          }
        }
      });
      if (conflict) {
        return res.status(400).json({
          message: 'This professional already has a confirmed booking that conflicts with this schedule. Ask them to message you, or select another professional.'
        });
      }
    }

    // Deduct credit only after confirming the schedule is actually bookable.
    pro.credits = (pro.credits || 0) - cost;
    pro.totalCreditsUsed = (pro.totalCreditsUsed || 0) + cost;
    await pro.save();
    await CreditTransaction.create({
      professional: pro._id, type: 'deduct', credits: cost,
      note: 'Selected for job post: ' + post.title,
      jobPostId: post._id
    });
    console.log('Credit deducted:', pro.email, 'new balance:', pro.credits);

    const commissionRate = settings?.commissionRate ?? 15;
    const totalBDT = rate * duration * sessions.length;
    const proNet = computeProNet(totalBDT, commissionRate);
    const address = [post.location?.thana, post.location?.district, post.location?.division]
      .filter(Boolean).join(', ') || 'See job post for location';

    const booking = await Booking.create({
      customer: post.customer,
      professional: pro._id,
      date: bookingDate,
      time,
      type,
      recurringDays,
      duration,
      address,
      workDescription: post.description,
      amount: totalBDT,
      proNet,
      hourlyRate: rate,
      status: 'Confirmed',
      isActive: true,
      sessions,
    });

    // Update post
    post.status = 'InProgress';
    post.selectedPro = pro._id;
    post.applicants = post.applicants.map(a => ({
      ...a.toObject(),
      status: a.professional.toString() === req.params.proId ? 'Selected' : 'Rejected'
    }));
    await post.save();

    const customer = await User.findById(post.customer);
    const dateStr = bookingDate.toISOString().slice(0, 10);

    // Notifications + emails to both parties - this Confirmed booking is what
    // unlocks chat between them, exactly like a direct booking acceptance does.
    await createNotification({
      userId: customer._id, type: 'booking',
      message: 'Booking confirmed with ' + pro.name + ' for your job post "' + post.title + '". Phone: ' + pro.phone + '. You can now chat.',
      link: '/my-bookings',
      io: req.io,
    });
    await createNotification({
      userId: pro._id, type: 'booking',
      message: 'You have been selected and confirmed for the job "' + post.title + '". Customer: ' + customer.name + '. Phone: ' + customer.phone + '.',
      link: '/my-bookings',
      io: req.io,
    });

    fireEmail({
      to: customer.email,
      subject: 'Booking Confirmed - Carely',
      title: 'Your booking is confirmed!',
      content:
        detailRow('Professional Name', pro.name) +
        detailRow('Professional Phone', pro.phone) +
        detailRow('Date', dateStr) +
        detailRow('Time', time) +
        detailRow('Job', post.title) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please arrange payment directly with the professional in cash or bKash. You can chat with them through the Carely app.</p>'
    });
    fireEmail({
      to: pro.email,
      subject: 'Job Selection Confirmed - Carely',
      title: 'You were selected and confirmed!',
      content:
        detailRow('Customer Name', customer.name) +
        detailRow('Customer Phone', customer.phone) +
        detailRow('Date', dateStr) +
        detailRow('Time', time) +
        detailRow('Job', post.title) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please arrive on time. Payment will be arranged directly with the customer.</p>'
    });

    res.json({ message: 'Professional selected and booking confirmed', post, booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to select', error: err.message });
  }
});

// Customer cancels post
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await JobPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.customer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    post.status = 'Cancelled';
    await post.save();
    res.json({ message: 'Post cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel' });
  }
});

module.exports = router;
