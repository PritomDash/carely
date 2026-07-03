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
const { approveTopUp } = require('./creditRoutes');
const adminAuth = require('../middlewares/adminAuthMiddleware');

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

    await Notification.create({
      user: user._id, type: 'admin',
      message: 'Your profile has been verified! You can now receive booking requests.',
      link: '/professional-profile'
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

// Feature / unfeature a professional profile
router.put('/users/:id/feature', adminAuth, async (req, res) => {
  const { featured, days } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.isFeatured = featured;
  user.featuredUntil = featured
    ? new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000)
    : null;
  await user.save();
  res.json({ message: 'Updated', user });
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
router.get('/settings', async (_req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
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
      commissionRate, emergencyPostFee, creditPacks,
      platformBkash, platformNagad,
      freeCreditsEnabled, freeCreditsAmount, customerFreeCredits,
      bookingAcceptCreditCost, jobSelectCreditCost, emergencyPostCreditCost,
      manualTopUpEnabled,
      paymentGatewayProvider,
      shurjopayUsername, shurjopayPassword, shurjopayClientId, shurjopayClientSecret, shurjopayBaseUrl,
      sslcommerzStoreId, sslcommerzPassword, sslcommerzSandbox,
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
    if (platformBkash          !== undefined) settings.platformBkash          = platformBkash;
    if (platformNagad          !== undefined) settings.platformNagad          = platformNagad;

    if (freeCreditsEnabled      !== undefined) settings.freeCreditsEnabled      = freeCreditsEnabled;
    if (freeCreditsAmount       !== undefined) settings.freeCreditsAmount       = Number(freeCreditsAmount);
    if (customerFreeCredits     !== undefined) settings.customerFreeCredits     = Number(customerFreeCredits);
    if (bookingAcceptCreditCost !== undefined) settings.bookingAcceptCreditCost = Number(bookingAcceptCreditCost);
    if (jobSelectCreditCost     !== undefined) settings.jobSelectCreditCost     = Number(jobSelectCreditCost);
    if (emergencyPostCreditCost !== undefined) settings.emergencyPostCreditCost = Number(emergencyPostCreditCost);
    if (manualTopUpEnabled      !== undefined) settings.manualTopUpEnabled      = manualTopUpEnabled;

    if (paymentGatewayProvider  !== undefined) settings.paymentGatewayProvider  = paymentGatewayProvider;
    if (shurjopayUsername       !== undefined) settings.shurjopayUsername       = shurjopayUsername;
    if (shurjopayPassword       !== undefined) settings.shurjopayPassword       = shurjopayPassword;
    if (shurjopayClientId       !== undefined) settings.shurjopayClientId       = shurjopayClientId;
    if (shurjopayClientSecret   !== undefined) settings.shurjopayClientSecret   = shurjopayClientSecret;
    if (shurjopayBaseUrl        !== undefined) settings.shurjopayBaseUrl        = shurjopayBaseUrl;
    if (sslcommerzStoreId       !== undefined) settings.sslcommerzStoreId       = sslcommerzStoreId;
    if (sslcommerzPassword      !== undefined) settings.sslcommerzPassword      = sslcommerzPassword;
    if (sslcommerzSandbox       !== undefined) settings.sslcommerzSandbox       = sslcommerzSandbox;

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
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

// Approve top up
router.put('/topup-requests/:id/approve', adminAuth, async (req, res) => {
  try {
    const request = await TopUpRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status === 'Approved') return res.status(400).json({ error: 'Already approved' });
    await approveTopUp(request, req.admin._id);
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

    await Notification.create({
      user: request.user._id,
      type: 'payment',
      message: 'Your top up request was rejected. Reason: ' + request.rejectedReason,
      link: '/my-credits'
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
    const proCredits = proAmount || settings?.freeCreditsAmount || 500;
    const custCredits = custAmount || settings?.customerFreeCredits || 10;

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
      await Notification.create({
        user: user._id, type: 'payment',
        message: proCredits + ' free credits added to your account by Carely!',
        link: '/my-credits'
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
      await Notification.create({
        user: user._id, type: 'payment',
        message: custCredits + ' free credits added to your account by Carely!',
        link: '/my-credits'
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

// Add credits to specific user
router.put('/credits/:userId', adminAuth, async (req, res) => {
  try {
    const { credits, note } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.credits += Number(credits);
    user.totalCreditsReceived = (user.totalCreditsReceived || 0) + Number(credits);
    await user.save();

    await CreditTransaction.create({
      professional: user._id, type: 'bonus',
      credits: Number(credits),
      note: note || 'Credits added by admin',
      addedBy: req.admin._id,
    });

    await Notification.create({
      user: user._id, type: 'payment',
      message: credits + ' credits added to your account.',
      link: '/my-credits'
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
