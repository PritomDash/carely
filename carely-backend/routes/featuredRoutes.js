const express = require('express');
const router = express.Router();
const User = require('../models/user');
const FeaturedRequest = require('../models/FeaturedRequest');
const Settings = require('../models/Settings');
const authMiddleware = require('../middlewares/authMiddleware');
const { createNotification } = require('../utils/notificationService');
const { fireEmail, emailButton, detailRow } = require('../utils/emailService');

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

    const payMethod = method || 'bkash';
    const platformNumber = payMethod === 'nagad' ? settings.platformNagad : settings.platformBkash;
    if (!platformNumber) {
      return res.status(400).json({ error: 'Payment number is not configured yet. Please contact support.' });
    }

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

    const admins = await User.find({ role: 'admin' }).select('_id email');
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'payment',
        message: req.user.name + ' requested a ' + pack.label + ' boost (৳' + pack.priceBDT + '). TRX: ' + transactionID,
        link: '/admin',
        io: req.io,
      });
      fireEmail({
        to: admin.email,
        subject: 'New Boost Request - Carely Admin',
        title: 'A professional submitted a boost purchase request',
        status: 'Pending',
        content:
          detailRow('Professional', req.user.name) +
          detailRow('Pack', pack.label) +
          detailRow('Amount', '৳' + pack.priceBDT) +
          detailRow('Method', method || 'bkash') +
          detailRow('Transaction ID', transactionID.trim()) +
          '<div style="margin-top:16px;text-align:center;">' +
          emailButton('Review in Admin Panel', FRONTEND_URL + '/admin?highlight=' + request._id) +
          '</div>'
      });
    }

    res.json({
      success: true,
      message: 'Boost request submitted! Your profile is featured once we verify - usually within a few hours.',
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
        return_url: process.env.FRONTEND_URL + '/boost?status=success',
        cancel_url: process.env.FRONTEND_URL + '/boost?status=cancel',
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
        fail_url: process.env.FRONTEND_URL + '/boost?status=fail',
        cancel_url: process.env.FRONTEND_URL + '/boost?status=cancel',
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
      return res.redirect(process.env.FRONTEND_URL + '/boost?status=fail');
    }
    const request = await FeaturedRequest.findOne({ gatewayOrderId: tran_id });
    if (!request || request.status === 'Approved') {
      return res.redirect(process.env.FRONTEND_URL + '/boost?status=already');
    }
    await approveFeaturedRequest(request, null, req.io);
    res.redirect(process.env.FRONTEND_URL + '/boost?status=success');
  } catch (err) {
    res.redirect(process.env.FRONTEND_URL + '/boost?status=error');
  }
});

// Helper to approve any boost request. Same atomic-guard pattern as
// approveTopUp() in creditRoutes.js - the Pending->Approved flip happens
// first and is what gets raced, so a double-click or duplicate webhook can
// only ever grant the boost once.
const approveFeaturedRequest = async (request, adminId, io) => {
  // Checked before the Pending->Approved claim, not after: if the account
  // was deleted after the request was submitted, the request must not get
  // stuck as "Approved" with nothing actually granted (which would also
  // make it look done and hide the problem from the admin).
  const userExists = await User.exists({ _id: request.user });
  if (!userExists) {
    await FeaturedRequest.findOneAndUpdate(
      { _id: request._id, status: 'Pending' },
      { status: 'Rejected', rejectedReason: 'User account no longer exists' }
    );
    return { error: 'user_not_found' };
  }

  const claimed = await FeaturedRequest.findOneAndUpdate(
    { _id: request._id, status: 'Pending' },
    {
      status: 'Approved',
      approvedAt: new Date(),
      autoVerified: !adminId,
      ...(adminId ? { approvedBy: adminId } : {}),
    },
    { new: true }
  );
  if (!claimed) return null;

  const user = await User.findById(claimed.user);
  const now = new Date();
  const base = user.isFeatured && user.featuredUntil && new Date(user.featuredUntil) > now
    ? new Date(user.featuredUntil)
    : now;

  user.isFeatured = true;
  user.featuredTier = claimed.tier;
  user.featuredUntil = new Date(base.getTime() + claimed.days * 24 * 60 * 60 * 1000);
  await user.save();

  await createNotification({
    userId: user._id,
    type: 'payment',
    message: 'Your Carely Boost is now active until ' + user.featuredUntil.toLocaleDateString('en-BD') + '!',
    link: '/boost',
    io,
  });

  fireEmail({
    to: user.email,
    subject: 'Boost Activated - Carely',
    title: 'Your Carely Boost is active!',
    content:
      '<p style="color:#374151;font-size:14px;line-height:1.6;">' +
      'Your profile now shows a gold star badge and ranks first among professionals in your area. You will also get new job alerts before non-boosted professionals see them.' +
      '</p>' +
      detailRow('Days Remaining', Math.max(0, Math.ceil((user.featuredUntil - Date.now()) / 86400000)) + ' days') +
      detailRow('Active Until', user.featuredUntil.toLocaleDateString('en-BD')) +
      '<div style="margin-top:16px;text-align:center;">' +
      emailButton('View My Boost', FRONTEND_URL + '/boost') +
      '</div>'
  });

  return claimed;
};

module.exports = router;
module.exports.approveFeaturedRequest = approveFeaturedRequest;
