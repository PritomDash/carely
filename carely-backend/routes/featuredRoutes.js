const express = require('express');
const router = express.Router();
const User = require('../models/user');
const FeaturedRequest = require('../models/FeaturedRequest');
const Settings = require('../models/Settings');
const authMiddleware = require('../middlewares/authMiddleware');
const { createNotification } = require('../utils/notificationService');
const { fireEmail, emailButton } = require('../utils/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const packForTier = (settings, tier) =>
  (settings?.featuredPacks || []).find((p) => p.tier === tier);

// Get my featured status + request history
router.get('/my-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isFeatured featuredUntil featuredTier');
    const requests = await FeaturedRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({
      isFeatured: !!(user.isFeatured && user.featuredUntil && new Date(user.featuredUntil) > new Date()),
      featuredUntil: user.featuredUntil,
      featuredTier: user.featuredTier,
      requests,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Submit manual boost payment (bKash or Nagad)
router.post('/request-manual', authMiddleware, async (req, res) => {
  try {
    const { tier, transactionID, senderNumber, method } = req.body;
    if (!tier || !transactionID) {
      return res.status(400).json({ error: 'Tier and transaction ID required' });
    }

    const settings = await Settings.findOne();
    if (!settings?.featuredListingEnabled) {
      return res.status(400).json({ error: 'Featured profiles are not available right now' });
    }
    if (!settings?.manualTopUpEnabled) {
      return res.status(400).json({ error: 'Manual payment is not available' });
    }

    const pack = packForTier(settings, tier);
    if (!pack) return res.status(400).json({ error: 'Invalid tier' });

    const duplicate = await FeaturedRequest.findOne({ transactionID: transactionID.trim() });
    if (duplicate) {
      return res.status(400).json({ error: 'This transaction ID has already been submitted' });
    }

    const request = await FeaturedRequest.create({
      user: req.user._id,
      tier,
      days: pack.days,
      amountBDT: pack.priceBDT,
      method: method || 'bkash',
      transactionID: transactionID.trim(),
      senderNumber,
    });

    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'payment',
        message: req.user.name + ' requested a ' + pack.label + ' boost (৳' + pack.priceBDT + '). TRX: ' + transactionID,
        link: '/admin',
        io: req.io,
      });
    }

    res.json({
      success: true,
      message: 'Boost request submitted! Your profile will be featured after verification (usually within 1 hour).',
      requestId: request._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit boost request' });
  }
});

// Initiate payment gateway boost purchase (ShurjoPay or SSLCommerz)
router.post('/request-gateway', authMiddleware, async (req, res) => {
  try {
    const { tier } = req.body;
    const settings = await Settings.findOne();

    if (!settings?.featuredListingEnabled) {
      return res.status(400).json({ error: 'Featured profiles are not available right now' });
    }
    if (!settings?.paymentGatewayEnabled) {
      return res.status(400).json({ error: 'Payment gateway not enabled' });
    }

    const pack = packForTier(settings, tier);
    if (!pack) return res.status(400).json({ error: 'Invalid tier' });

    const provider = settings?.paymentGatewayProvider;
    const orderId = 'BOOST-' + req.user._id.toString().slice(-6) + '-' + Date.now();

    if (provider === 'shurjopay') {
      const axios = require('axios');

      const tokenRes = await axios.post(settings.shurjopayBaseUrl + '/api/get_token', {
        username: settings.shurjopayUsername,
        password: settings.shurjopayPassword,
      });
      const token = tokenRes.data.token;
      const storeId = tokenRes.data.store_id;

      const orderRes = await axios.post(settings.shurjopayBaseUrl + '/api/secret-pay', {
        prefix: 'BOOST',
        token,
        store_id: storeId,
        return_url: process.env.FRONTEND_URL + '/my-credits?status=success',
        cancel_url: process.env.FRONTEND_URL + '/my-credits?status=cancel',
        amount: pack.priceBDT,
        order_id: orderId,
        currency: 'BDT',
        customer_name: req.user.name,
        customer_phone: req.user.phone || '01000000000',
        customer_email: req.user.email,
        customer_address: 'Bangladesh',
        customer_city: 'Dhaka',
        client_ip: req.ip || '127.0.0.1',
      });

      await FeaturedRequest.create({
        user: req.user._id,
        tier,
        days: pack.days,
        amountBDT: pack.priceBDT,
        method: 'shurjopay',
        gatewayOrderId: orderId,
        status: 'Pending',
      });

      return res.json({ success: true, paymentUrl: orderRes.data.checkout_url, orderId });
    }

    if (provider === 'sslcommerz') {
      const SSLCommerzPayment = require('sslcommerz-lts');
      const store_id = settings.sslcommerzStoreId;
      const store_passwd = settings.sslcommerzPassword;
      const is_live = !settings.sslcommerzSandbox;

      const data = {
        total_amount: pack.priceBDT,
        currency: 'BDT',
        tran_id: orderId,
        success_url: process.env.BACKEND_URL + '/api/featured/sslcommerz-success',
        fail_url: process.env.FRONTEND_URL + '/my-credits?status=fail',
        cancel_url: process.env.FRONTEND_URL + '/my-credits?status=cancel',
        cus_name: req.user.name,
        cus_email: req.user.email,
        cus_phone: req.user.phone || '01000000000',
        cus_add1: 'Bangladesh',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        shipping_method: 'NO',
        product_name: pack.label,
        product_category: 'Digital',
        product_profile: 'non-physical-goods',
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      const apiResponse = await sslcz.init(data);

      await FeaturedRequest.create({
        user: req.user._id,
        tier,
        days: pack.days,
        amountBDT: pack.priceBDT,
        method: 'sslcommerz',
        gatewayOrderId: orderId,
        status: 'Pending',
      });

      if (apiResponse?.GatewayPageURL) {
        return res.json({ success: true, paymentUrl: apiResponse.GatewayPageURL, orderId });
      }
      return res.status(500).json({ error: 'Could not initiate payment' });
    }

    return res.status(400).json({ error: 'No payment gateway configured' });
  } catch (err) {
    console.error('Featured gateway error:', err.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// SSLCommerz success callback for boost purchases
router.post('/sslcommerz-success', async (req, res) => {
  try {
    const { tran_id, status } = req.body;
    if (status !== 'VALID' && status !== 'VALIDATED') {
      return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=fail');
    }
    const request = await FeaturedRequest.findOne({ gatewayOrderId: tran_id });
    if (!request || request.status === 'Approved') {
      return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=already');
    }
    await approveFeaturedRequest(request, null, req.io);
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=success');
  } catch (err) {
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=error');
  }
});

// Helper to approve any boost request
const approveFeaturedRequest = async (request, adminId, io) => {
  const user = await User.findById(request.user);
  const now = new Date();
  const base = user.isFeatured && user.featuredUntil && new Date(user.featuredUntil) > now
    ? new Date(user.featuredUntil)
    : now;

  user.isFeatured = true;
  user.featuredTier = request.tier;
  user.featuredUntil = new Date(base.getTime() + request.days * 24 * 60 * 60 * 1000);
  await user.save();

  request.status = 'Approved';
  request.approvedAt = new Date();
  request.autoVerified = !adminId;
  if (adminId) request.approvedBy = adminId;
  await request.save();

  await createNotification({
    userId: user._id,
    type: 'payment',
    message: 'Your profile is now Featured until ' + user.featuredUntil.toLocaleDateString('en-BD') + '!',
    link: '/my-credits',
    io,
  });

  fireEmail({
    to: user.email,
    subject: 'Profile Featured - Carely',
    title: 'Your profile is now Featured!',
    content:
      '<p style="color:#374151;font-size:14px;line-height:1.6;">' +
      'Your profile will now appear higher in search results until ' + user.featuredUntil.toLocaleDateString('en-BD') + '.' +
      '</p>' +
      '<div style="margin-top:16px;text-align:center;">' +
      emailButton('View My Profile', FRONTEND_URL + '/edit-profile') +
      '</div>'
  });
};

module.exports = router;
module.exports.approveFeaturedRequest = approveFeaturedRequest;
