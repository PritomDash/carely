const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/user');
const Settings = require('../models/Settings');
const CreditTransaction = require('../models/CreditTransaction');
const authMiddleware = require('../middlewares/authMiddleware');
const { getAppliedRate, computeProNet } = require('../utils/pricing');
const { sendEmail } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationService');

// Emails must never block the API response - SMTP delivery can be slow or
// hang entirely (e.g. blocked egress on the hosting provider). Fire-and-forget
// with an internal catch so a stuck send can't stall a booking action.
const fireEmail = (opts) => {
  sendEmail(opts).catch((err) => console.error('Email send failed:', err.message));
};

const detailRow = (label, value) =>
  '<div class="detail-row"><div class="detail-label">' + label + '</div><div class="detail-value">' + value + '</div></div>';

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

// GET /api/bookings/availability/:professionalId
// Single call the frontend uses to render a fully-blocking calendar + time
// grid: which weekdays the pro works, their weekly hours, and every booked
// slot (from Confirmed, active sessions) so the UI can disable anything
// invalid before the user ever submits.
router.get('/availability/:professionalId', async (req, res) => {
  try {
    const pro = await User.findById(req.params.professionalId).select('availability').lean();
    if (!pro) return res.status(404).json({ error: 'Professional not found' });

    const DAYNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const workingWeekdays = [];
    DAYNAMES.forEach((day, index) => {
      const slot = pro.availability?.[day];
      if (slot?.start && slot?.end) workingWeekdays.push(index);
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const confirmedBookings = await Booking.find({
      professional: req.params.professionalId,
      isActive: true,
      status: 'Confirmed',
      sessions: { $elemMatch: { date: { $gte: todayStart } } }
    }).select('sessions').lean();

    const bookedSlots = {};
    for (const b of confirmedBookings) {
      for (const s of b.sessions || []) {
        if (!s?.date) continue;
        const sd = new Date(s.date);
        if (sd < todayStart) continue;
        const dateKey = ymd(sd);
        if (!bookedSlots[dateKey]) bookedSlots[dateKey] = [];
        bookedSlots[dateKey].push({ startTime: s.startTime, endTime: s.endTime });
      }
    }

    res.json({
      workingWeekdays,
      availability: pro.availability || {},
      bookedSlots,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load availability' });
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
      .select('weekdayRate saturdayRate sundayRate hourlyRate availability isVerified name email phone professionalType').lean();
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
      const rate = getAppliedRate(s.dateStr, pro) || 0;
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
    await createNotification({
      userId: professionalId, type: 'booking',
      message: 'New booking request from ' + req.user.name + ' for ' + date + ' at ' + time + '. Respond within 24 hours.',
      link: '/my-bookings',
      io: req.io,
    });

    fireEmail({
      to: pro.email,
      subject: 'New Booking Request - Carely',
      title: 'You have a new booking request!',
      content:
        detailRow('Customer', req.user.name) +
        detailRow('Date', date) +
        detailRow('Time', time) +
        detailRow('Duration', hours + ' hours') +
        detailRow('Address', address) +
        detailRow('Work Description', workDescription) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please log in and accept or decline within 24 hours. If there is no response the booking will be auto-declined.</p>'
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

    // Check and deduct credits
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    const creditCost = settings.bookingAcceptCreditCost ?? 1;
    const professional = await User.findById(req.user._id);

    if ((professional.credits || 0) < creditCost) {
      return res.status(403).json({
        message: 'You do not have enough credits to accept this booking. Please top up your credits.',
        credits: professional.credits || 0,
        required: creditCost,
        insufficientCredits: true,
      });
    }

    professional.credits = (professional.credits || 0) - creditCost;
    professional.totalCreditsUsed = (professional.totalCreditsUsed || 0) + creditCost;
    await professional.save();

    await CreditTransaction.create({
      professional: professional._id,
      type: 'deduct',
      credits: creditCost,
      note: 'Accepted booking request',
      bookingId: booking._id,
    });

    console.log('Credit deducted:', professional.email, 'new balance:', professional.credits);

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
    const dateStr = booking.date.toISOString().slice(0, 10);

    await createNotification({
      userId: booking.customer._id, type: 'booking',
      message: 'Booking confirmed with ' + booking.professional.name + '. Phone: ' + booking.professional.phone + '. Date: ' + dateStr + ' at ' + booking.time + '. You can now chat.',
      link: '/my-bookings',
      io: req.io,
    });
    await createNotification({
      userId: booking.professional._id, type: 'booking',
      message: 'Booking confirmed with ' + booking.customer.name + '. Phone: ' + booking.customer.phone + '. Address: ' + booking.address + '. Date: ' + dateStr + '.',
      link: '/my-bookings',
      io: req.io,
    });

    fireEmail({
      to: booking.customer.email,
      subject: 'Booking Confirmed - Carely',
      title: 'Your booking is confirmed!',
      content:
        detailRow('Professional Name', booking.professional.name) +
        detailRow('Professional Phone', booking.professional.phone) +
        detailRow('Date', dateStr) +
        detailRow('Time', booking.time) +
        detailRow('Duration', hours + ' hours') +
        detailRow('Address', booking.address) +
        detailRow('Work', booking.workDescription) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please arrange payment directly with the professional in cash or bKash. You can chat with them through the Carely app.</p>'
    });

    fireEmail({
      to: booking.professional.email,
      subject: 'Booking Accepted - Carely',
      title: 'You accepted a booking!',
      content:
        detailRow('Customer Name', booking.customer.name) +
        detailRow('Customer Phone', booking.customer.phone) +
        detailRow('Date', dateStr) +
        detailRow('Time', booking.time) +
        detailRow('Duration', hours + ' hours') +
        detailRow('Address', booking.address) +
        detailRow('Work', booking.workDescription) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please arrive on time. Payment will be arranged directly with the customer.</p>'
    });

    res.json({ message: 'Booking accepted and confirmed', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept booking', error: err.message });
  }
});

// POST /api/bookings/decline/:id
router.post('/decline/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer professional');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'professional' ||
        booking.professional._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    booking.status = 'Declined';
    booking.isActive = false;
    await booking.save();

    await createNotification({
      userId: booking.customer._id, type: 'booking',
      message: booking.professional.name + ' has declined your booking. Please try another professional.',
      link: '/my-bookings',
      io: req.io,
    });

    fireEmail({
      to: booking.customer.email,
      subject: 'Booking Declined - Carely',
      title: 'Your booking was declined',
      content:
        '<p style="color:#1A1A2E;font-size:14px;line-height:1.7;">' + booking.professional.name + ' has declined your booking request. Please try another professional on Carely.</p>'
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

    const dateStr = booking.date.toISOString().slice(0, 10);

    if (isCustomer) {
      await createNotification({
        userId: booking.professional._id, type: 'booking',
        message: 'Booking on ' + dateStr + ' was cancelled by the customer.',
        link: '/my-bookings',
        io: req.io,
      });

      fireEmail({
        to: booking.professional.email,
        subject: 'Booking Cancelled - Carely',
        title: 'A booking was cancelled',
        content:
          '<p style="color:#1A1A2E;font-size:14px;line-height:1.7;">' + booking.customer.name + ' has cancelled the booking on ' + dateStr + '.</p>'
      });
    } else {
      await createNotification({
        userId: booking.customer._id, type: 'booking',
        message: booking.professional.name + ' cancelled your booking on ' + dateStr + '. Please try another professional.',
        link: '/my-bookings',
        io: req.io,
      });

      fireEmail({
        to: booking.customer.email,
        subject: 'Booking Cancelled - Carely',
        title: 'Your booking was cancelled',
        content:
          '<p style="color:#1A1A2E;font-size:14px;line-height:1.7;">' + booking.professional.name + ' has cancelled your booking on ' + dateStr + '. Please search for another professional on Carely.</p>'
      });
    }

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
    await releaseCalendar(booking);

    await createNotification({
      userId: booking.customer._id, type: 'booking',
      message: booking.professional.name + ' marked your job as complete. Please rate your experience.',
      link: '/rate/' + booking._id,
      io: req.io,
    });

    fireEmail({
      to: booking.customer.email,
      subject: 'Service Completed - Carely',
      title: 'Service completed - please rate your experience',
      content:
        detailRow('Professional Name', booking.professional.name) +
        detailRow('Date', booking.date.toISOString().slice(0, 10)) +
        detailRow('Time', booking.time) +
        '<p style="margin-top:20px;color:#64748B;font-size:13px;">Please log in to Carely and rate your experience with ' + booking.professional.name + '.</p>'
    });

    res.json({ message: 'Job marked as done' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark done' });
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
      .populate('customer', 'name email phone profilePhoto')
      .populate('professional', 'name email phone profilePhoto professionalType')
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

module.exports = router;
