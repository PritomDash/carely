const express = require('express');
const router = express.Router();
const User = require('../models/user');
const CreditTransaction = require('../models/CreditTransaction');
const TopUpRequest = require('../models/TopUpRequest');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const authMiddleware = require('../middlewares/authMiddleware');
const { fireEmail, detailRow } = require('../utils/emailService');

// Get my balance
router.get('/my-balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('credits totalCreditsUsed totalCreditsReceived');
    res.json({
      credits: user.credits || 0,
      totalUsed: user.totalCreditsUsed || 0,
      totalReceived: user.totalCreditsReceived || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get my transaction history
router.get('/my-transactions', authMiddleware, async (req, res) => {
  try {
    const txns = await CreditTransaction.find({ professional: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get my top up requests
router.get('/my-topups', authMiddleware, async (req, res) => {
  try {
    const requests = await TopUpRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(20);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Submit manual top up request (bKash or Nagad)
router.post('/topup-manual', authMiddleware, async (req, res) => {
  try {
    const { credits, amountBDT, transactionID, senderNumber, paymentMethod } = req.body;

    if (!credits || !amountBDT || !transactionID) {
      return res.status(400).json({ error: 'Credits, amount and transaction ID required' });
    }

    const settings = await Settings.findOne();
    if (!settings?.manualTopUpEnabled) {
      return res.status(400).json({ error: 'Manual top up is not available' });
    }

    // Prevent duplicate transaction IDs
    const duplicate = await TopUpRequest.findOne({ transactionID: transactionID.trim() });
    if (duplicate) {
      return res.status(400).json({ error: 'This transaction ID has already been submitted' });
    }

    const request = await TopUpRequest.create({
      user: req.user._id,
      credits: Number(credits),
      amountBDT: Number(amountBDT),
      transactionID: transactionID.trim(),
      senderNumber,
      paymentMethod: paymentMethod || 'bkash',
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: 'payment',
        message: req.user.name + ' requested ' + credits + ' credits top up (৳' + amountBDT + ') via ' + paymentMethod + '. TRX: ' + transactionID,
        link: '/admin'
      });
      if (req.io) req.io.to(String(admin._id)).emit('newNotification', {
        type: 'payment',
        message: 'New top up request from ' + req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Top up request submitted! Credits will be added after verification (usually within 1 hour).',
      requestId: request._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit top up request' });
  }
});

// Initiate payment gateway top up (ShurjoPay or SSLCommerz)
router.post('/topup-gateway', authMiddleware, async (req, res) => {
  try {
    const { credits, amountBDT } = req.body;
    const settings = await Settings.findOne();

    if (!settings?.paymentGatewayEnabled) {
      return res.status(400).json({ error: 'Payment gateway not enabled' });
    }

    const provider = settings?.paymentGatewayProvider;

    if (provider === 'shurjopay') {
      // ShurjoPay integration
      const axios = require('axios');

      // Step 1: Get token
      const tokenRes = await axios.post(settings.shurjopayBaseUrl + '/api/get_token', {
        username: settings.shurjopayUsername,
        password: settings.shurjopayPassword,
      });
      const token = tokenRes.data.token;
      const storeId = tokenRes.data.store_id;

      // Step 2: Create order
      const orderId = 'CARE-' + req.user._id.toString().slice(-6) + '-' + Date.now();
      const orderRes = await axios.post(settings.shurjopayBaseUrl + '/api/secret-pay', {
        prefix: 'CARE',
        token,
        store_id: storeId,
        return_url: process.env.FRONTEND_URL + '/my-credits?status=success',
        cancel_url: process.env.FRONTEND_URL + '/my-credits?status=cancel',
        amount: amountBDT,
        order_id: orderId,
        currency: 'BDT',
        customer_name: req.user.name,
        customer_phone: req.user.phone || '01000000000',
        customer_email: req.user.email,
        customer_address: 'Bangladesh',
        customer_city: 'Dhaka',
        client_ip: req.ip || '127.0.0.1',
      });

      // Save pending request
      await TopUpRequest.create({
        user: req.user._id,
        credits: Number(credits),
        amountBDT: Number(amountBDT),
        paymentMethod: 'shurjopay',
        gatewayOrderId: orderId,
        status: 'Pending',
      });

      return res.json({
        success: true,
        paymentUrl: orderRes.data.checkout_url,
        orderId,
      });
    }

    if (provider === 'sslcommerz') {
      const SSLCommerzPayment = require('sslcommerz-lts');
      const store_id = settings.sslcommerzStoreId;
      const store_passwd = settings.sslcommerzPassword;
      const is_live = !settings.sslcommerzSandbox;

      const orderId = 'CARE-' + req.user._id.toString().slice(-6) + '-' + Date.now();

      const data = {
        total_amount: amountBDT,
        currency: 'BDT',
        tran_id: orderId,
        success_url: process.env.BACKEND_URL + '/api/credits/sslcommerz-success',
        fail_url: process.env.FRONTEND_URL + '/my-credits?status=fail',
        cancel_url: process.env.FRONTEND_URL + '/my-credits?status=cancel',
        cus_name: req.user.name,
        cus_email: req.user.email,
        cus_phone: req.user.phone || '01000000000',
        cus_add1: 'Bangladesh',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        shipping_method: 'NO',
        product_name: credits + ' Carely Credits',
        product_category: 'Digital',
        product_profile: 'non-physical-goods',
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      const apiResponse = await sslcz.init(data);

      await TopUpRequest.create({
        user: req.user._id,
        credits: Number(credits),
        amountBDT: Number(amountBDT),
        paymentMethod: 'sslcommerz',
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
    console.error('Gateway error:', err.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// ShurjoPay webhook callback
router.post('/shurjopay-callback', async (req, res) => {
  try {
    const { order_id, sp_code } = req.body;
    if (sp_code !== '1000') return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=fail');

    const request = await TopUpRequest.findOne({ gatewayOrderId: order_id });
    if (!request || request.status === 'Approved') {
      return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=already');
    }

    await approveTopUp(request, null);
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=success');
  } catch (err) {
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=error');
  }
});

// SSLCommerz success callback
router.post('/sslcommerz-success', async (req, res) => {
  try {
    const { tran_id, status } = req.body;
    if (status !== 'VALID' && status !== 'VALIDATED') {
      return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=fail');
    }
    const request = await TopUpRequest.findOne({ gatewayOrderId: tran_id });
    if (!request || request.status === 'Approved') {
      return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=already');
    }
    await approveTopUp(request, null);
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=success');
  } catch (err) {
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=error');
  }
});

// Helper function to approve any top up
const approveTopUp = async (request, adminId) => {
  const user = await User.findById(request.user);
  user.credits += request.credits;
  user.totalCreditsReceived = (user.totalCreditsReceived || 0) + request.credits;
  await user.save();

  await CreditTransaction.create({
    professional: user._id,
    type: 'purchase',
    credits: request.credits,
    note: request.autoVerified
      ? 'Top up via payment gateway (auto verified)'
      : 'Top up approved by admin. TRX: ' + request.transactionID,
    addedBy: adminId || null,
  });

  request.status = 'Approved';
  request.approvedAt = new Date();
  request.autoVerified = !adminId;
  if (adminId) request.approvedBy = adminId;
  await request.save();

  await Notification.create({
    user: user._id,
    type: 'payment',
    message: request.credits + ' credits added to your account successfully!',
    link: '/my-credits'
  });

  fireEmail({
    to: user.email,
    subject: 'Top Up Approved - Carely',
    title: 'Your credits have been added!',
    content:
      detailRow('Credits Added', request.credits) +
      detailRow('Amount', '৳' + request.amountBDT) +
      detailRow('New Balance', user.credits) +
      '<p style="margin-top:20px;color:#64748B;font-size:13px;">Thank you for topping up your Carely credits.</p>'
  });
};

module.exports = router;
module.exports.approveTopUp = approveTopUp;
