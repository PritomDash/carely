const express = require('express');
const router = express.Router();
const User = require('../models/user');
const CreditTransaction = require('../models/CreditTransaction');
const TopUpRequest = require('../models/TopUpRequest');
const Settings = require('../models/Settings');
const authMiddleware = require('../middlewares/authMiddleware');
const { createNotification } = require('../utils/notificationService');
const { fireEmail, emailButton, detailRow } = require('../utils/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
    const { credits, transactionID, senderNumber, paymentMethod } = req.body;

    if (!credits || !transactionID) {
      return res.status(400).json({ error: 'Credits and transaction ID required' });
    }

    const settings = await Settings.findOne();
    if (!settings?.manualTopUpEnabled) {
      return res.status(400).json({ error: 'Manual top up is not available' });
    }

    // The price is always looked up server-side from the matching pack in
    // Settings.creditPacks by credits amount - amountBDT is never trusted
    // from the client, since a forged request body could otherwise claim
    // any number of credits for any price and rely on an admin approving
    // it without cross-checking against the current pack list.
    const pack = (settings.creditPacks || []).find((p) => p.credits === Number(credits));
    if (!pack) {
      return res.status(400).json({ error: 'Invalid credit pack' });
    }

    const method = paymentMethod || 'bkash';
    const platformNumber = method === 'nagad' ? settings.platformNagad : settings.platformBkash;
    if (!platformNumber) {
      return res.status(400).json({ error: 'Payment number is not configured yet. Please contact support.' });
    }

    // Prevent duplicate transaction IDs
    const duplicate = await TopUpRequest.findOne({ transactionID: transactionID.trim() });
    if (duplicate) {
      return res.status(400).json({ error: 'This transaction ID has already been submitted' });
    }

    const request = await TopUpRequest.create({
      user: req.user._id,
      credits: pack.credits,
      amountBDT: pack.priceBDT,
      transactionID: transactionID.trim(),
      senderNumber,
      paymentMethod: paymentMethod || 'bkash',
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id email');
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'payment',
        message: req.user.name + ' requested ' + pack.credits + ' credits top up (৳' + pack.priceBDT + ') via ' + paymentMethod + '. TRX: ' + transactionID,
        link: '/admin',
        io: req.io,
      });
      fireEmail({
        to: admin.email,
        subject: 'New Top Up Request - Carely Admin',
        title: 'A customer submitted a credit top up request',
        status: 'Pending',
        content:
          detailRow('Customer', req.user.name) +
          detailRow('Credits', String(pack.credits)) +
          detailRow('Amount', '৳' + pack.priceBDT) +
          detailRow('Method', paymentMethod || 'bkash') +
          detailRow('Transaction ID', transactionID.trim()) +
          '<div style="margin-top:16px;text-align:center;">' +
          emailButton('Review in Admin Panel', FRONTEND_URL + '/admin?highlight=' + request._id) +
          '</div>'
      });
    }

    res.json({
      success: true,
      message: 'Top up request submitted! Your credits are added once we verify - usually within a few hours.',
      requestId: request._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit top up request' });
  }
});

// Initiate payment gateway top up (ShurjoPay or SSLCommerz)
router.post('/topup-gateway', authMiddleware, async (req, res) => {
  try {
    const { credits } = req.body;
    const settings = await Settings.findOne();

    if (!settings?.paymentGatewayEnabled) {
      return res.status(400).json({ error: 'Payment gateway not enabled' });
    }

    // Same rule as the manual top up path: the price always comes from the
    // matching pack in Settings.creditPacks, never from the client.
    const pack = (settings.creditPacks || []).find((p) => p.credits === Number(credits));
    if (!pack) return res.status(400).json({ error: 'Invalid credit pack' });
    const amountBDT = pack.priceBDT;

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
    if (!request) return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=fail');

    const result = await approveTopUp(request, null, req.io);
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=' + (result ? 'success' : 'already'));
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
    if (!request) return res.redirect(process.env.FRONTEND_URL + '/my-credits?status=fail');

    const result = await approveTopUp(request, null, req.io);
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=' + (result ? 'success' : 'already'));
  } catch (err) {
    res.redirect(process.env.FRONTEND_URL + '/my-credits?status=error');
  }
});

// Helper function to approve any top up. Returns the claimed request on
// success, or null if it was already approved by another call (admin
// double-click, or a payment gateway sending a duplicate webhook - both
// happen in practice, so this must not be able to double-credit).
//
// The status flip is done as one atomic findOneAndUpdate guarded on the
// request still being Pending - only whichever concurrent call wins that
// race gets a non-null result back and proceeds to grant credits; every
// other caller sees null and bails out immediately.
const approveTopUp = async (request, adminId, io) => {
  // Checked before the Pending->Approved claim: if the account was deleted
  // after the request was submitted, it must not get stuck "Approved" with
  // no credits actually granted and no way to tell from the request itself.
  const userExists = await User.exists({ _id: request.user });
  if (!userExists) {
    await TopUpRequest.findOneAndUpdate(
      { _id: request._id, status: 'Pending' },
      { status: 'Rejected', rejectedReason: 'User account no longer exists' }
    );
    return { error: 'user_not_found' };
  }

  const claimed = await TopUpRequest.findOneAndUpdate(
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

  const user = await User.findByIdAndUpdate(
    claimed.user,
    { $inc: { credits: claimed.credits, totalCreditsReceived: claimed.credits } },
    { new: true }
  );

  await CreditTransaction.create({
    professional: user._id,
    type: 'purchase',
    credits: claimed.credits,
    note: claimed.autoVerified
      ? 'Top up via payment gateway (auto verified)'
      : 'Top up approved by admin. TRX: ' + claimed.transactionID,
    addedBy: adminId || null,
  });

  await createNotification({
    userId: user._id,
    type: 'payment',
    message: claimed.credits + ' credits added to your account successfully!',
    link: '/my-credits',
    io,
  });

  fireEmail({
    to: user.email,
    subject: 'Top Up Approved - Carely',
    title: 'Credits added to your account!',
    content:
      '<p style="color:#374151;font-size:14px;line-height:1.6;">' +
      claimed.credits + ' credits have been added to your account.' +
      '</p>' +
      detailRow('New Balance', user.credits + ' credits') +
      '<p style="margin-top:16px;color:#64748B;font-size:13px;">Credits are used to post Emergency jobs, which alert every matching professional in your area instantly. Normal job posts and bookings are always free.</p>' +
      '<div style="margin-top:16px;text-align:center;">' +
      emailButton('View My Credits', FRONTEND_URL + '/my-credits') +
      '</div>'
  });

  return claimed;
};

module.exports = router;
module.exports.approveTopUp = approveTopUp;
