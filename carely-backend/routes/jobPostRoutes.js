const express = require('express');
const router = express.Router();
const JobPost = require('../models/JobPost');
const Booking = require('../models/Booking');
const User = require('../models/user');
const Settings = require('../models/Settings');
const CreditTransaction = require('../models/CreditTransaction');
const authMiddleware = require('../middlewares/authMiddleware');
const { getAppliedRate, computeProNet } = require('../utils/pricing');
const { fireEmail, detailRow, emailButton } = require('../utils/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
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

    const emergencyCost = settings?.emergencyPostCreditCost ?? 3;
    // Credits are a customer-only mechanic that exist solely to pay for
    // Emergency posts - always charged when isEmergency is true (gated
    // separately by emergencyPostEnabled above). Professionals never have
    // any credit check at all (see bookingRoutes.js accept and this file's
    // select route).
    const chargeForEmergency = !!isEmergency;

    if (chargeForEmergency) {
      const customer = await User.findById(req.user._id).select('credits');
      const currentCredits = customer?.credits || 0;
      if (currentCredits < emergencyCost) {
        return res.status(403).json({
          message: `You need ${emergencyCost} credits to post an emergency job. You have ${currentCredits}.`,
          credits: currentCredits,
          required: emergencyCost,
          insufficientCredits: true,
        });
      }
    }

    const post = await JobPost.create({
      customer: req.user._id,
      title, description, serviceType, location, schedule,
      bookingType, budgetBDT,
      isEmergency: !!isEmergency
    });

    if (chargeForEmergency) {
      // Atomic guard so two concurrent emergency posts from the same
      // customer can't both spend the same last credit.
      const updatedCustomer = await User.findOneAndUpdate(
        { _id: req.user._id, credits: { $gte: emergencyCost } },
        { $inc: { credits: -emergencyCost, totalCreditsUsed: emergencyCost } },
        { new: true }
      );
      if (!updatedCustomer) {
        // Lost the race - don't leave an uncharged emergency post behind.
        await JobPost.deleteOne({ _id: post._id });
        const current = await User.findById(req.user._id).select('credits');
        const currentCredits = current?.credits || 0;
        return res.status(403).json({
          message: `You need ${emergencyCost} credits to post an emergency job. You have ${currentCredits}.`,
          credits: currentCredits,
          required: emergencyCost,
          insufficientCredits: true,
        });
      }
      await CreditTransaction.create({
        professional: updatedCustomer._id, type: 'deduct', credits: emergencyCost,
        note: 'Emergency post: ' + title,
        jobPostId: post._id,
      });
      console.log('Credit deducted:', updatedCustomer.email, 'new balance:', updatedCustomer.credits);
    }

    // Notify professionals in two waves (see MONETIZATION.md for the full
    // design). Matched by serviceType only - broader reach is better at
    // launch than restricting to the same division - with the district/
    // thana mentioned in the message text instead.
    //
    // Emergency posts skip the delay entirely and notify every matching
    // professional at once (the customer paid specifically for urgency).
    // Normal posts notify Boosted professionals immediately (wave 1) and
    // leave delayedNotifySent=false so the cron in cronJobs.js sends wave 2
    // to everyone else once boostNotificationDelayMinutes has passed.
    //
    // Parallelized with Promise.all, not a sequential for-await loop - the
    // old loop did one createNotification round-trip per matching
    // professional in series, which scales linearly and can push job
    // creation itself past any reasonable timeout as the professional base
    // grows (already slow enough with a few dozen test accounts to exceed
    // a 20s timeout). Still awaited (not fire-and-forget) so
    // delayedNotifySent is reliably set before the response, since a
    // customer can otherwise fetch the post immediately after and see a
    // stale value.
    if (req.io) {
      const matchingPros = await User.find({
        role: 'professional',
        professionalType: serviceType,
      }).select('_id isFeatured featuredUntil');

      const now = new Date();
      const isBoosted = (p) => !!(p.isFeatured && p.featuredUntil && new Date(p.featuredUntil) > now);
      const areaText = [location?.thana, location?.district].filter(Boolean).join(', ') || 'your area';

      if (isEmergency) {
        await Promise.all(matchingPros.map((pro) => createNotification({
          userId: pro._id, type: 'jobpost',
          message: 'URGENT: ' + title + ' - ' + areaText,
          link: '/job-posts/' + post._id,
          io: req.io,
        })));
        post.delayedNotifySent = true;
        await post.save();
      } else {
        const boostedPros = matchingPros.filter(isBoosted);
        await Promise.all(boostedPros.map((pro) => createNotification({
          userId: pro._id, type: 'jobpost',
          message: 'New ' + serviceType + ' job in ' + areaText + " - you're seeing this first",
          link: '/job-posts/' + post._id,
          io: req.io,
        })));
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

    await createNotification({
      userId: post.customer, type: 'jobpost',
      message: req.user.name + ' is interested in your job post: ' + post.title,
      link: '/my-posts',
      io: req.io,
    });

    res.json({ message: 'Applied successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply' });
  }
});

// Customer selects a professional - free for the professional, creates a
// real Confirmed booking (with sessions, so the calendar/chat/emails all
// behave exactly like accepting a direct booking request does).
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

    const pro = await User.findById(req.params.proId);
    if (!pro) return res.status(404).json({ message: 'Professional not found' });

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

    // Being selected from a job post is always free for professionals -
    // no credit check or deduction here at all.

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
      status: 'Confirmed',
      content:
        detailRow('Professional Name', pro.name) +
        detailRow('Professional Phone', pro.phone) +
        detailRow('Date', dateStr) +
        detailRow('Time', time) +
        detailRow('Job', post.title) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please arrange payment directly with the professional in cash or bKash. You can chat with them through the Carely app.</p>' +
        '<div style="margin-top:16px;text-align:center;">' +
        emailButton('View Booking Details', FRONTEND_URL + '/my-bookings?highlight=' + booking._id) +
        emailButton('Open Chat', FRONTEND_URL + '/chat-inbox', '#16A34A') +
        '</div>'
    });
    fireEmail({
      to: pro.email,
      subject: 'Job Selection Confirmed - Carely',
      title: 'You were selected and confirmed!',
      status: 'Confirmed',
      content:
        detailRow('Customer Name', customer.name) +
        detailRow('Customer Phone', customer.phone) +
        detailRow('Date', dateStr) +
        detailRow('Time', time) +
        detailRow('Job', post.title) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please arrive on time. Payment will be arranged directly with the customer.</p>' +
        '<div style="margin-top:16px;text-align:center;">' +
        emailButton('View Booking', FRONTEND_URL + '/my-bookings?highlight=' + booking._id) +
        emailButton('Open Chat', FRONTEND_URL + '/chat-inbox', '#16A34A') +
        '</div>'
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
