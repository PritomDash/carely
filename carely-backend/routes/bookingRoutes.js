const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/user');
const Settings = require('../models/Settings');
const CreditTransaction = require('../models/CreditTransaction');
const authMiddleware = require('../middlewares/authMiddleware');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');
const nodemailer = require('nodemailer');
const { getAppliedRate, computeProNet } = require('../utils/pricing');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendEmail = async ({ to, subject, html }) => {
  if (!to) return;
  try { await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html }); }
  catch (e) { console.error('Email failed:', e.message); }
};

const ymd = (d) => new Date(d).toISOString().slice(0, 10);

const dateAtNoonUTC = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate(), 12, 0, 0, 0));
};

const dayBoundsUTC = (dateStr) => {
  const [Y, M, D] = dateStr.split('-').map(Number);
  return {
    start: new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0)),
    end:   new Date(Date.UTC(Y, M - 1, D, 23, 59, 59, 999))
  };
};

const getEndTime = (start, hrs) => {
  const [hour, minute] = String(start).split(':').map(Number);
  const end = new Date();
  end.setHours(hour + Number(hrs || 1), minute, 0, 0);
  return end.toTimeString().slice(0, 5);
};

const releaseCalendar = async (booking) => {
  booking.isActive = false;
  booking.sessions = [];
  await booking.save();
};

// GET /api/bookings/disabled-days/:professionalId
router.get('/disabled-days/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const pro = await User.findById(professionalId).select('availability');

    const bookings = await Booking.find({
      professional: professionalId,
      isActive: true,
      status: 'Confirmed'
    }).select('type date sessions').lean();

    const DAYNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const fullyBlockedDates = new Set();
    const partiallyBlockedDates = {};
    const disabledWeekdays = new Set();

    for (const b of bookings) {
      for (const s of b.sessions || []) {
        if (!s?.date) continue;
        const sd = new Date(s.date);
        const dateKey = ymd(sd);
        const dayName = DAYNAMES[sd.getUTCDay()];

        if (!partiallyBlockedDates[dateKey]) partiallyBlockedDates[dateKey] = [];
        partiallyBlockedDates[dateKey].push({ start: s.startTime, end: s.endTime });

        // Check if day is fully blocked
        const avail = pro?.availability?.[dayName];
        if (avail?.start && avail?.end) {
          const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
          const availMins = toMin(avail.end) - toMin(avail.start);
          const bookedMins = partiallyBlockedDates[dateKey].reduce((sum, r) => {
            return sum + (toMin(r.end) - toMin(r.start));
          }, 0);
          if (bookedMins >= availMins) {
            fullyBlockedDates.add(dateKey);
            disabledWeekdays.add(dayName);
          }
        }
      }
    }

    // Remove fully blocked from partial
    for (const d of fullyBlockedDates) delete partiallyBlockedDates[d];

    // availabilityHours
    const availabilityHours = {};
    const avail = pro?.availability || {};
    for (const [day, slot] of Object.entries(avail)) {
      if (slot?.start && slot?.end) availabilityHours[day] = { start: slot.start, end: slot.end };
    }

    res.json({
      fullyBlockedDates: Array.from(fullyBlockedDates),
      partiallyBlockedDates,
      disabledWeekdays: Array.from(disabledWeekdays),
      availabilityHours
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch disabled days' });
  }
});

// GET /api/bookings/unavailable-times
router.get('/unavailable-times', async (req, res) => {
  try {
    const { professionalId, date } = req.query;
    if (!professionalId || !date)
      return res.status(400).json({ error: 'professionalId and date required' });

    const { start: dayStart, end: dayEnd } = dayBoundsUTC(String(date));

    const bookings = await Booking.find({
      professional: professionalId,
      isActive: true,
      status: 'Confirmed',
      sessions: { $elemMatch: { date: { $gte: dayStart, $lte: dayEnd } } }
    }).lean();

    const bookedRanges = [];
    for (const b of bookings) {
      for (const s of b.sessions || []) {
        const sd = new Date(s.date);
        if (sd >= dayStart && sd <= dayEnd) {
          bookedRanges.push({ start: s.startTime, end: s.endTime });
        }
      }
    }

    const pro = await User.findById(professionalId).select('availability').lean();
    const d = new Date(date);
    const DAYNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = DAYNAMES[d.getDay()];
    const availableWindow = pro?.availability?.[dayName] || { start: '08:00', end: '20:00' };

    res.json({ bookedRanges, availableWindow, minimumDuration: 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unavailable times' });
  }
});

// POST /api/bookings/check-availability
router.post('/check-availability', async (req, res) => {
  try {
    const { professionalId, date, time, duration } = req.body;
    if (!professionalId || !date || !time || !duration)
      return res.status(400).json({ message: 'Missing fields' });

    const pro = await User.findById(professionalId).select('availability').lean();
    const DAYNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const d = new Date(date);
    const dayName = DAYNAMES[d.getDay()];
    const avail = pro?.availability?.[dayName];

    if (!avail?.start || !avail?.end) {
      return res.json({ available: false, reason: 'no_availability_this_day' });
    }

    const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
    const reqStart = toMin(time);
    const reqEnd   = reqStart + Number(duration) * 60;
    const availStart = toMin(avail.start);
    const availEnd   = toMin(avail.end);

    if (reqStart < availStart || reqEnd > availEnd) {
      return res.json({ available: false, reason: 'outside_availability', availableWindow: avail });
    }

    const requestedEndTime   = getEndTime(time, duration);
    const { start: dayStart, end: dayEnd } = dayBoundsUTC(String(date));

    const conflict = await Booking.findOne({
      professional: professionalId,
      isActive: true,
      status: 'Confirmed',
      sessions: {
        $elemMatch: {
          date:      { $gte: dayStart, $lte: dayEnd },
          startTime: { $lt: requestedEndTime },
          endTime:   { $gt: time }
        }
      }
    });

    if (conflict) {
      return res.json({ available: false, reason: 'overlaps_existing' });
    }

    res.json({ available: true });
  } catch (err) {
    res.status(500).json({ error: 'Availability check failed' });
  }
});

// POST /api/bookings/create
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { professionalId, date, time, type, recurringDays = [],
            duration = 1, address, workDescription } = req.body;

    if (!professionalId || !date || !time || !type || !address || !workDescription)
      return res.status(400).json({ message: 'Missing required fields' });

    const pro = await User.findById(professionalId)
      .select('weekdayRate saturdayRate sundayRate hourlyRate availability isVerified').lean();
    if (!pro) return res.status(404).json({ message: 'Professional not found' });
    if (!pro.isVerified) return res.status(400).json({ message: 'Professional is not verified' });

    // Validate availability
    const DAYNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const d = new Date(date);
    const dayName = DAYNAMES[d.getDay()];
    const avail = pro.availability?.[dayName];

    if (!avail?.start || !avail?.end)
      return res.status(400).json({ message: 'Professional is not available on this day' });

    const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
    const reqStart = toMin(time);
    const reqEnd   = reqStart + Number(duration) * 60;

    if (reqStart < toMin(avail.start) || reqEnd > toMin(avail.end))
      return res.status(400).json({ message: 'Booking time is outside professional availability hours' });

    // Build sessions to check
    const daysMap = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
    let chargeSessions = [];

    if (type === 'long') {
      const startDate = new Date(date);
      const selected = (recurringDays || [])
        .map(dv => daysMap[String(dv).toLowerCase().trim()])
        .filter(n => n !== undefined);

      for (let i = 0; i < 7; i++) {
        const cur = new Date(startDate);
        cur.setDate(cur.getDate() + i);
        if (selected.includes(cur.getDay())) {
          chargeSessions.push({ dateStr: cur.toISOString().slice(0, 10) });
        }
      }
      if (chargeSessions.length === 0)
        chargeSessions.push({ dateStr: new Date(date).toISOString().slice(0, 10) });
    } else {
      chargeSessions.push({ dateStr: new Date(date).toISOString().slice(0, 10) });
    }

    // Check each session for conflicts
    for (const s of chargeSessions) {
      const { start: dayStart, end: dayEnd } = dayBoundsUTC(s.dateStr);
      const endTime = getEndTime(time, duration);
      const conflict = await Booking.findOne({
        professional: professionalId,
        isActive: true,
        status: 'Confirmed',
        sessions: {
          $elemMatch: {
            date:      { $gte: dayStart, $lte: dayEnd },
            startTime: { $lt: endTime },
            endTime:   { $gt: time }
          }
        }
      });
      if (conflict) {
        return res.status(400).json({
          message: 'Professional is already booked on ' + s.dateStr + ' at ' + time
        });
      }
    }

    // Calculate amount
    const settings = await Settings.findOne().lean();
    const commissionRate = settings?.commissionRate ?? 15;
    const hours = Number(duration);

    let totalBDT = 0;
    for (const s of chargeSessions) {
      const rate = getAppliedRate(s.dateStr, pro);
      if (!rate || rate <= 0)
        return res.status(400).json({ message: 'Professional has no rate set for selected day(s)' });
      totalBDT += rate * hours;
    }

    const proNet = computeProNet(totalBDT, commissionRate);

    const booking = await Booking.create({
      customer: req.user._id,
      professional: professionalId,
      date, time, type, duration: hours,
      recurringDays, address, workDescription,
      amount: totalBDT,
      proNet,
      hourlyRate: getAppliedRate(new Date(date).toISOString().slice(0, 10), pro),
      status: 'AwaitingAcceptance',
      isActive: false,
      sessions: [],
    });

    // Notify professional
    await Notification.create({
      user: professionalId, type: 'booking',
      message: 'New booking request from ' + req.user.name,
      link: '/my-bookings'
    });

    await sendEmail({
      to: pro.email,
      subject: 'New Booking Request - Carely',
      html: '<h3>Hi,</h3><p>You have a new booking request from <b>' + req.user.name + '</b>.</p><p>Date: ' + date + '</p><p>Time: ' + time + '</p><p>Please log in to accept or decline within 24 hours.</p>'
    });

    res.json({ message: 'Booking request sent', bookingId: booking._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create booking', error: err.message });
  }
});

// POST /api/bookings/accept/:id
router.post('/accept/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'professional' ||
        booking.professional._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    if (booking.status === 'Confirmed')
      return res.json({ message: 'Already confirmed', booking });

    // Check credits
    const settings = await Settings.findOne();
    if (settings?.creditsEnabled) {
      const pro = await User.findById(req.user._id);
      if (pro.credits < 1) {
        return res.status(403).json({ message: 'Insufficient credits. Please top up to accept bookings.' });
      }
      pro.credits -= 1;
      pro.totalCreditsUsed += 1;
      await pro.save();
      await CreditTransaction.create({
        professional: pro._id, type: 'deduct', credits: 1,
        note: 'Accepted booking ' + booking._id, bookingId: booking._id
      });
    }

    // Re-check for conflicts at accept time
    const hours = booking.duration || 1;
    const daysMap = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
    const { type, recurringDays = [], date, time } = booking;
    const startDate = new Date(date);
    let sessions = [];

    if (type === 'long') {
      const selected = (recurringDays || [])
        .map(dv => daysMap[String(dv).toLowerCase().trim()])
        .filter(n => n !== undefined);

      for (let i = 0; i < 28; i++) {
        const cur = new Date(startDate);
        cur.setDate(cur.getDate() + i);
        if (selected.includes(cur.getDay())) {
          sessions.push({
            date:      dateAtNoonUTC(cur),
            startTime: time,
            endTime:   getEndTime(time, hours)
          });
        }
      }
    } else {
      sessions.push({ date: dateAtNoonUTC(date), startTime: time, endTime: getEndTime(time, hours) });
    }

    // Conflict check at accept time
    for (const s of sessions) {
      const dateStr = ymd(s.date);
      const { start: dayStart, end: dayEnd } = dayBoundsUTC(dateStr);
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        professional: booking.professional._id,
        isActive: true,
        status: 'Confirmed',
        sessions: {
          $elemMatch: {
            date:      { $gte: dayStart, $lte: dayEnd },
            startTime: { $lt: s.endTime },
            endTime:   { $gt: s.startTime }
          }
        }
      });
      if (conflict) {
        return res.status(400).json({
          message: 'A conflicting booking was confirmed while this request was pending'
        });
      }
    }

    booking.sessions = sessions;
    booking.status = 'Confirmed';
    booking.isActive = true;
    await booking.save();

    // Notifications + emails
    await Notification.create({
      user: booking.customer._id, type: 'booking',
      message: 'Your booking with ' + booking.professional.name + ' is confirmed!',
      link: '/my-bookings'
    });

    await sendEmail({
      to: booking.customer.email,
      subject: 'Booking Confirmed - Carely',
      html: '<h3>Hi ' + booking.customer.name + ',</h3><p>Your booking with <b>' + booking.professional.name + '</b> is confirmed.</p><p>Date: ' + booking.date + '</p><p>Time: ' + booking.time + '</p><p>Address: ' + booking.address + '</p><br><p><b>Professional contact:</b> ' + booking.professional.phone + '</p>'
    });

    await sendEmail({
      to: booking.professional.email,
      subject: 'Booking Confirmed - Carely',
      html: '<h3>Hi ' + booking.professional.name + ',</h3><p>Your booking with <b>' + booking.customer.name + '</b> is confirmed.</p><p>Date: ' + booking.date + '</p><p>Time: ' + booking.time + '</p><p>Address: ' + booking.address + '</p><br><p><b>Customer contact:</b> ' + booking.customer.phone + '</p>'
    });

    res.json({ message: 'Booking accepted and confirmed', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept booking', error: err.message });
  }
});

// POST /api/bookings/decline/:id
router.post('/decline/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'Declined';
    booking.isActive = false;
    await booking.save();

    await Notification.create({
      user: booking.customer._id, type: 'booking',
      message: 'Your booking request was declined. Please try another professional.',
      link: '/my-bookings'
    });

    res.json({ message: 'Booking declined' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to decline' });
  }
});

// POST /api/bookings/cancel/:id
router.post('/cancel/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isCustomer = req.user.role === 'customer' && booking.customer._id.toString() === req.user._id.toString();
    const isPro      = req.user.role === 'professional' && booking.professional._id.toString() === req.user._id.toString();

    if (!isCustomer && !isPro)
      return res.status(403).json({ message: 'Not authorized' });

    booking.status = 'Cancelled';
    await releaseCalendar(booking);

    const otherUser = isCustomer ? booking.professional : booking.customer;
    const cancelBy  = isCustomer ? 'Customer' : 'Professional';

    await Notification.create({
      user: otherUser._id, type: 'booking',
      message: 'Booking on ' + booking.date + ' was cancelled by ' + cancelBy,
      link: '/my-bookings'
    });

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel' });
  }
});

// POST /api/bookings/mark-done/:id - Professional marks job done
router.post('/mark-done/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'professional' ||
        booking.professional._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    booking.status = 'Completed';
    booking.taskCompletedEmailSent = true;
    booking.taskEmailSentTime = new Date();
    await booking.save();

    await Notification.create({
      user: booking.customer._id, type: 'booking',
      message: booking.professional.name + ' has marked your job as done. Please confirm or dispute within 24 hours.',
      link: '/my-bookings'
    });

    await sendEmail({
      to: booking.customer.email,
      subject: 'Job Completed - Please Confirm - Carely',
      html: '<h3>Hi ' + booking.customer.name + ',</h3><p><b>' + booking.professional.name + '</b> has marked your booking as completed.</p><p>Please log in and confirm or dispute within <b>24 hours</b>. If you do nothing, payment will be released automatically.</p>'
    });

    res.json({ message: 'Job marked as done' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark done' });
  }
});

// POST /api/bookings/action/:id - Customer confirms or disputes
router.post('/action/:id', authMiddleware, async (req, res) => {
  try {
    const { action, reason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (action === 'confirm') {
      if (booking.payoutStatus === 'Released')
        return res.json({ message: 'Already confirmed' });

      booking.taskConfirmedByCustomer = true;
      booking.payoutStatus = 'Released';
      await releaseCalendar(booking);

      await Notification.create({
        user: booking.professional._id, type: 'payment',
        message: 'Customer confirmed job completion. Payout will be processed by admin.',
        link: '/earnings'
      });

      return res.json({ message: 'Confirmed. Payout will be released.' });
    }

    if (action === 'dispute') {
      if (booking.status === 'Disputed')
        return res.json({ message: 'Already disputed' });

      booking.status = 'Disputed';
      booking.refundRequested = true;
      booking.refundReason = reason || 'Work not completed satisfactorily';
      booking.disputeRaisedAt = new Date();
      await booking.save();

      await Notification.create({
        user: booking.professional._id, type: 'dispute',
        message: 'Customer has disputed the booking. Admin will review.',
        link: '/my-bookings'
      });

      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          user: admin._id, type: 'dispute',
          message: 'Dispute raised for booking ' + booking._id + ' - ' + booking.refundReason,
          link: '/admin'
        });
      }

      return res.json({ message: 'Dispute raised. Admin will review.' });
    }

    return res.status(400).json({ message: 'Invalid action' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bookings/my-bookings
router.get('/my-bookings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const role   = req.user.role;

    let filter;
    if (role === 'customer')      filter = { customer: userId };
    else if (role === 'professional') filter = { professional: userId };
    else return res.status(403).json({ message: 'Unauthorized' });

    const bookings = await Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('professional', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('professional', 'name email phone hourlyRate weekdayRate saturdayRate sundayRate');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - approve refund
router.post('/admin-approve-refund/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'Refunded';
    booking.payoutStatus = 'Pending';
    await releaseCalendar(booking);

    await Notification.create({
      user: booking.customer._id, type: 'payment',
      message: 'Your refund for booking on ' + booking.date + ' has been approved.',
      link: '/my-bookings'
    });

    await sendEmail({
      to: booking.customer?.email,
      subject: 'Refund Approved - Carely',
      html: '<p>Hi ' + (booking.customer?.name || '') + ',</p><p>Your refund for the booking with <b>' + (booking.professional?.name || '') + '</b> has been approved. Admin will process the refund shortly.</p>'
    });

    res.json({ message: 'Refund approved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve refund' });
  }
});

// Admin - reject refund
router.post('/admin-reject-refund/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'Confirmed';
    booking.refundRequested = false;
    await booking.save();

    await Notification.create({
      user: booking.customer._id, type: 'dispute',
      message: 'Your dispute for booking on ' + booking.date + ' was reviewed. Payout will proceed to professional.',
      link: '/my-bookings'
    });

    res.json({ message: 'Refund rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject refund' });
  }
});

module.exports = router;
