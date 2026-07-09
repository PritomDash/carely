const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const ChatMessage = require('../models/chatMessage');
const JobPost = require('../models/JobPost');
const Settings = require('../models/Settings');
const CreditTransaction = require('../models/CreditTransaction');
const TopUpRequest = require('../models/TopUpRequest');
const FeaturedRequest = require('../models/FeaturedRequest');
const { approveTopUp } = require('./creditRoutes');
const { approveFeaturedRequest } = require('./featuredRoutes');
const adminAuth = require('../middlewares/adminAuthMiddleware');
const { sendEmail } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationService');

// Diagnostic: send a real test email to the admin's own address and report
// whether it actually succeeded (unlike normal booking emails, which are
// fire-and-forget on purpose, this one intentionally waits for the result).
router.get('/test-email', adminAuth, async (req, res) => {
  const result = await sendEmail({
    to: req.query.to || req.admin.email,
    subject: 'Carely Test Email',
    title: 'Email delivery test',
    content: '<p style="color:#1A1A2E;font-size:14px;">If you are reading this, email is configured correctly and Carely can send mail.</p>',
  });
  res.status(result.success ? 200 : 500).json(result);
});

// Admin self-service password change (no DB access required to rotate it)
router.put('/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }

    const admin = await User.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    admin.password = newPassword;
    await admin.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Verify a professional
router.put('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isVerified = true;
    user.profileApproved = true;
    await user.save();

    await createNotification({
      userId: user._id, type: 'admin',
      message: 'Your profile has been verified! You can now receive booking requests.',
      link: '/professional-profile',
      io: req.io,
    });

    res.json({ message: 'User verified', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify' });
  }
});

// Suspend / reactivate user
router.put('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isVerified = !user.isVerified;
    await user.save();
    res.json({ message: user.isVerified ? 'User reactivated' : 'User suspended', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Feature / unfeature a professional profile (manual admin override).
// Registered under two paths ("feature" is the original route, "set-featured"
// matches the featured-system naming) so either can be called.
const setFeaturedHandler = async (req, res) => {
  const { featured, days, tier } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.isFeatured = featured;
  user.featuredTier = featured ? (tier || 'premium') : 'none';
  user.featuredUntil = featured
    ? new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000)
    : null;
  await user.save();

  if (featured) {
    await createNotification({
      userId: user._id,
      type: 'payment',
      message: 'Your profile is now Featured until ' + user.featuredUntil.toLocaleDateString('en-BD') + '!',
      link: '/my-credits',
      io: req.io,
    });
  }

  res.json({ message: 'Updated', user });
};
router.put('/users/:id/feature', adminAuth, setFeaturedHandler);
router.put('/users/:id/set-featured', adminAuth, setFeaturedHandler);

// Pending featured/boost requests
router.get('/featured-requests', adminAuth, async (req, res) => {
  try {
    const requests = await FeaturedRequest.find({ status: 'Pending' })
      .populate('user', 'name email role phone')
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Currently featured professionals
router.get('/featured-requests/active', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isFeatured: true, featuredUntil: { $gt: new Date() } })
      .select('name email professionalType featuredTier featuredUntil')
      .sort({ featuredUntil: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/featured-requests/:id/approve', adminAuth, async (req, res) => {
  try {
    const request = await FeaturedRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    const result = await approveFeaturedRequest(request, req.admin._id, req.io);
    if (!result) return res.status(400).json({ error: 'Already approved' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/featured-requests/:id/reject', adminAuth, async (req, res) => {
  try {
    const request = await FeaturedRequest.findById(req.params.id).populate('user', '_id name');
    if (!request) return res.status(404).json({ error: 'Not found' });

    request.status = 'Rejected';
    request.rejectedReason = req.body.reason || 'Could not verify transaction';
    await request.save();

    await createNotification({
      userId: request.user._id,
      type: 'payment',
      message: 'Your boost request was rejected. Reason: ' + request.rejectedReason,
      link: '/my-credits',
      io: req.io,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === String(req.admin?._id))
      return res.status(400).json({ error: "Cannot delete your own account" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: "Cannot delete another admin" });

    await Promise.all([
      Booking.deleteMany({ $or: [{ customer: id }, { professional: id }] }),
      Notification.deleteMany({ user: id }),
      ChatMessage.deleteMany({ $or: [{ sender: id }, { recipient: id }] }),
    ]);

    await User.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all bookings
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('customer', 'name email')
      .populate('professional', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get all job posts
router.get('/job-posts', adminAuth, async (req, res) => {
  try {
    const posts = await JobPost.find().populate('customer', 'name').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job posts' });
  }
});

// Get settings
// Public - the frontend reads this unauthenticated to render credit packs,
// feature flags, and the maintenance banner. Never return gateway secrets here.
const PUBLIC_SETTINGS_EXCLUDE = '-shurjopayUsername -shurjopayPassword -shurjopayClientId -shurjopayClientSecret -sslcommerzStoreId -sslcommerzPassword';
router.get('/settings', async (_req, res) => {
  try {
    let settings = await Settings.findOne().select(PUBLIC_SETTINGS_EXCLUDE);
    if (!settings) {
      await Settings.create({});
      settings = await Settings.findOne().select(PUBLIC_SETTINGS_EXCLUDE);
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Update settings
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const {
      creditsEnabled, emergencyPostEnabled, cashPaymentEnabled,
      paymentGatewayEnabled, featuredListingEnabled, subscriptionEnabled,
      commissionRate, emergencyPostFee, creditPacks, featuredPacks,
      platformBkash, platformNagad,
      freeCreditsEnabled, freeCreditsAmount, customerFreeCredits,
      bookingAcceptCreditCost, jobSelectCreditCost, emergencyPostCreditCost,
      manualTopUpEnabled, boostNotificationDelayMinutes,
      paymentGatewayProvider,
      shurjopayUsername, shurjopayPassword, shurjopayClientId, shurjopayClientSecret, shurjopayBaseUrl,
      sslcommerzStoreId, sslcommerzPassword, sslcommerzSandbox,
      registrationsPaused, maintenanceMode, maintenanceMessage,
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (creditsEnabled         !== undefined) settings.creditsEnabled         = creditsEnabled;
    if (emergencyPostEnabled   !== undefined) settings.emergencyPostEnabled   = emergencyPostEnabled;
    if (cashPaymentEnabled     !== undefined) settings.cashPaymentEnabled     = cashPaymentEnabled;
    if (paymentGatewayEnabled  !== undefined) settings.paymentGatewayEnabled  = paymentGatewayEnabled;
    if (featuredListingEnabled !== undefined) settings.featuredListingEnabled = featuredListingEnabled;
    if (subscriptionEnabled    !== undefined) settings.subscriptionEnabled    = subscriptionEnabled;
    if (commissionRate         !== undefined) settings.commissionRate         = Number(commissionRate);
    if (emergencyPostFee       !== undefined) settings.emergencyPostFee       = Number(emergencyPostFee);
    if (creditPacks            !== undefined) settings.creditPacks            = creditPacks;
    if (featuredPacks          !== undefined) settings.featuredPacks          = featuredPacks;
    if (platformBkash          !== undefined) settings.platformBkash          = platformBkash;
    if (platformNagad          !== undefined) settings.platformNagad          = platformNagad;

    if (freeCreditsEnabled      !== undefined) settings.freeCreditsEnabled      = freeCreditsEnabled;
    if (freeCreditsAmount       !== undefined) settings.freeCreditsAmount       = Number(freeCreditsAmount);
    if (customerFreeCredits     !== undefined) settings.customerFreeCredits     = Number(customerFreeCredits);
    if (bookingAcceptCreditCost !== undefined) settings.bookingAcceptCreditCost = Number(bookingAcceptCreditCost);
    if (jobSelectCreditCost     !== undefined) settings.jobSelectCreditCost     = Number(jobSelectCreditCost);
    if (emergencyPostCreditCost !== undefined) settings.emergencyPostCreditCost = Number(emergencyPostCreditCost);
    if (manualTopUpEnabled      !== undefined) settings.manualTopUpEnabled      = manualTopUpEnabled;
    if (boostNotificationDelayMinutes !== undefined) settings.boostNotificationDelayMinutes = Number(boostNotificationDelayMinutes);

    if (paymentGatewayProvider  !== undefined) settings.paymentGatewayProvider  = paymentGatewayProvider;
    if (shurjopayUsername       !== undefined) settings.shurjopayUsername       = shurjopayUsername;
    if (shurjopayPassword       !== undefined) settings.shurjopayPassword       = shurjopayPassword;
    if (shurjopayClientId       !== undefined) settings.shurjopayClientId       = shurjopayClientId;
    if (shurjopayClientSecret   !== undefined) settings.shurjopayClientSecret   = shurjopayClientSecret;
    if (shurjopayBaseUrl        !== undefined) settings.shurjopayBaseUrl        = shurjopayBaseUrl;
    if (sslcommerzStoreId       !== undefined) settings.sslcommerzStoreId       = sslcommerzStoreId;
    if (sslcommerzPassword      !== undefined) settings.sslcommerzPassword      = sslcommerzPassword;
    if (sslcommerzSandbox       !== undefined) settings.sslcommerzSandbox       = sslcommerzSandbox;

    if (registrationsPaused !== undefined) settings.registrationsPaused = registrationsPaused;
    if (maintenanceMode     !== undefined) settings.maintenanceMode     = maintenanceMode;
    if (maintenanceMessage  !== undefined) settings.maintenanceMessage  = maintenanceMessage;

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// God Mode: broadcast an in-app notification (+ socket push) to every user
router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const { message, link } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const users = await User.find({ role: { $in: ['customer', 'professional'] } }).select('_id');
    const notifications = await Notification.insertMany(
      users.map((u) => ({
        user: u._id,
        type: 'admin',
        message: message.trim(),
        link: link || '/notifications',
      }))
    );

    if (req.io) {
      users.forEach((u) => {
        req.io.to(String(u._id)).emit('newNotification', { type: 'admin', message: message.trim() });
      });
    }

    res.json({ message: 'Broadcast sent', recipientCount: notifications.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// God Mode: export all users as CSV
router.get('/export-users-csv', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    const columns = ['_id', 'name', 'email', 'phone', 'role', 'professionalType', 'isVerified', 'credits', 'createdAt'];
    const escapeCsv = (v) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const rows = [columns.join(',')];
    for (const u of users) {
      rows.push(columns.map((c) => escapeCsv(c === 'createdAt' ? new Date(u[c]).toISOString() : u[c])).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="carely-users-' + Date.now() + '.csv"');
    res.send(rows.join('\n'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// Get pending top up requests
router.get('/topup-requests', adminAuth, async (req, res) => {
  try {
    const requests = await TopUpRequest.find({ status: 'Pending' })
      .populate('user', 'name email role phone')
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get all top up requests with filter
router.get('/topup-requests/all', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await TopUpRequest.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Approve top up. approveTopUp() itself does the atomic Pending->Approved
// guard, so this stays correct even if two approve clicks race each other.
router.put('/topup-requests/:id/approve', adminAuth, async (req, res) => {
  try {
    const request = await TopUpRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    const result = await approveTopUp(request, req.admin._id, req.io);
    if (!result) return res.status(400).json({ error: 'Already approved' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Reject top up
router.put('/topup-requests/:id/reject', adminAuth, async (req, res) => {
  try {
    const request = await TopUpRequest.findById(req.params.id)
      .populate('user', '_id name');
    if (!request) return res.status(404).json({ error: 'Not found' });

    request.status = 'Rejected';
    request.rejectedReason = req.body.reason || 'Could not verify transaction';
    await request.save();

    await createNotification({
      userId: request.user._id,
      type: 'payment',
      message: 'Your top up request was rejected. Reason: ' + request.rejectedReason,
      link: '/my-credits',
      io: req.io,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Renew all users credits
router.post('/credits/renew-all', adminAuth, async (req, res) => {
  try {
    const { proAmount, custAmount } = req.body;
    const settings = await Settings.findOne();
    // Nullish coalescing, not ||  - freeCreditsAmount is deliberately 0 for
    // professionals under the current monetization model, and `0 || 500`
    // would silently override that back to the old hardcoded default.
    const proCredits = proAmount ?? settings?.freeCreditsAmount ?? 0;
    const custCredits = custAmount ?? settings?.customerFreeCredits ?? 10;

    const professionals = await User.find({ role: 'professional' });
    const customers = await User.find({ role: 'customer' });

    for (const user of professionals) {
      user.credits += proCredits;
      user.totalCreditsReceived = (user.totalCreditsReceived || 0) + proCredits;
      await user.save();
      await CreditTransaction.create({
        professional: user._id, type: 'bonus', credits: proCredits,
        note: 'Admin credit renewal', addedBy: req.admin._id,
      });
      await createNotification({
        userId: user._id, type: 'payment',
        message: proCredits + ' free credits added to your account by Carely!',
        link: '/my-credits',
        io: req.io,
      });
    }

    for (const user of customers) {
      user.credits += custCredits;
      user.totalCreditsReceived = (user.totalCreditsReceived || 0) + custCredits;
      await user.save();
      await CreditTransaction.create({
        professional: user._id, type: 'bonus', credits: custCredits,
        note: 'Admin credit renewal', addedBy: req.admin._id,
      });
      await createNotification({
        userId: user._id, type: 'payment',
        message: custCredits + ' free credits added to your account by Carely!',
        link: '/my-credits',
        io: req.io,
      });
    }

    res.json({
      success: true,
      professionalsUpdated: professionals.length,
      customersUpdated: customers.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Renewal failed' });
  }
});

// Credits management
router.get('/credits', adminAuth, async (req, res) => {
  try {
    const pros = await User.find({ role: 'professional' })
      .select('name email credits totalCreditsUsed isVerified location')
      .sort({ credits: 1 });
    res.json(pros);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

// Add (or remove, with a negative amount) credits for a specific user
router.put('/credits/:userId', adminAuth, async (req, res) => {
  try {
    const amount = Number(req.body.credits);
    const note = req.body.note;
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'credits must be a non-zero number' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Floor at 0 - an admin deduction (negative amount) larger than the
    // user's balance must never push credits negative.
    user.credits = Math.max(0, (user.credits || 0) + amount);
    if (amount > 0) {
      user.totalCreditsReceived = (user.totalCreditsReceived || 0) + amount;
    }
    await user.save();

    await CreditTransaction.create({
      professional: user._id, type: amount > 0 ? 'bonus' : 'deduct',
      credits: Math.abs(amount),
      note: note || 'Credits adjusted by admin',
      addedBy: req.admin._id,
    });

    await createNotification({
      userId: user._id, type: 'payment',
      message: amount > 0
        ? amount + ' credits added to your account.'
        : Math.abs(amount) + ' credits removed from your account.',
      link: '/my-credits',
      io: req.io,
    });

    res.json({ success: true, credits: user.credits });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalPros, totalCustomers, totalBookings, confirmedBookings,
           completedBookings, cancelledBookings, topPros] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'professional' }),
      User.countDocuments({ role: 'customer' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Completed' }),
      Booking.countDocuments({ status: 'Cancelled' }),
      Booking.aggregate([
        { $match: { status: 'Confirmed' } },
        { $group: { _id: '$professional', totalBookings: { $sum: 1 } } },
        { $sort: { totalBookings: -1 } },
        { $limit: 5 }
      ])
    ]);

    const proIds = topPros.map(r => r._id);
    const pros = await User.find({ _id: { $in: proIds } }).select('name');
    const topProsData = topPros.map(r => ({
      _id: r._id,
      name: pros.find(p => String(p._id) === String(r._id))?.name || 'Unknown',
      totalBookings: r.totalBookings
    }));

    res.json({
      totalUsers, totalPros, totalCustomers, totalBookings,
      confirmedBookings, completedBookings, cancelledBookings, topProfessionals: topProsData
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Admin ID (for chat)
router.get('/admin-id', async (_req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' }).select('_id');
    res.json({ adminId: admin?._id || null });
  } catch (err) {
    res.status(500).json({ adminId: null });
  }
});

module.exports = router;
