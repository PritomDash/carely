const express = require('express');
const router = express.Router();
const User = require('../models/user');
const CreditTransaction = require('../models/CreditTransaction');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail, emailButton } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationService');
const { upload } = require('../middlewares/uploadMiddleware');
const { isValidPhone, normalizePhone } = require('../utils/phoneValidation');

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '90d' });

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mycarely.app';
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Constant-time compare so a stored hash can't be inferred from response
// timing - a plain === would short-circuit on the first differing byte.
const tokensMatch = (storedHex, candidateHex) => {
  if (!storedHex) return false;
  const a = Buffer.from(storedHex, 'hex');
  const b = Buffer.from(candidateHex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// In-memory per-email throttle for /forgot-password - protects our email
// provider quota from being drained by someone hammering one address, and
// (combined with the always-neutral response) gives an attacker nothing to
// distinguish "rate limited" from "email sent". Fine as in-process state
// since this runs as a single Render instance; would need a shared store
// (Redis) if it's ever scaled to multiple instances.
const FORGOT_PASSWORD_MAX = 3;
const FORGOT_PASSWORD_WINDOW_MS = 60 * 60 * 1000;
const forgotPasswordAttempts = new Map();
const isForgotPasswordRateLimited = (email) => {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const attempts = (forgotPasswordAttempts.get(key) || []).filter((t) => now - t < FORGOT_PASSWORD_WINDOW_MS);
  if (attempts.length >= FORGOT_PASSWORD_MAX) {
    forgotPasswordAttempts.set(key, attempts);
    return true;
  }
  attempts.push(now);
  forgotPasswordAttempts.set(key, attempts);
  return false;
};

router.post('/register', upload.fields([
  { name: 'profilePhoto' },
  { name: 'idDocument' },
  { name: 'policeClearance' },
  { name: 'courseCertificate' },
]), async (req, res) => {
  try {
    const {
      name, email, password, phone, role,
      professionalType, experience, about,
      hourlyRate, weekdayRate, saturdayRate, sundayRate,
      location, availability,
      nidNumber, bmdc, bnmc, bkashNumber, nagadNumber,
      referralCode: referralCodeFromBody,
    } = req.body;

    if (!name || !email || !password || !phone || !role)
      return res.status(400).json({ message: 'All fields are required' });

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ message: "That doesn't look like a valid phone number." });
    }

    // Public registration may only ever create customer/professional accounts -
    // 'admin' must never be self-assignable through this endpoint.
    const normalizedRole = String(role).toLowerCase();
    if (!['customer', 'professional'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    let settings = await Settings.findOne();
    if (settings?.registrationsPaused) {
      return res.status(503).json({ message: 'New registrations are temporarily paused. Please check back soon.' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const userData = { name, email, password, phone: normalizedPhone, role: normalizedRole };

    if (userData.role === 'professional') {
      if (professionalType) userData.professionalType = professionalType;
      if (experience) userData.experience = experience;
      if (about) userData.about = about;
      if (hourlyRate)   userData.hourlyRate   = Number(hourlyRate);
      if (weekdayRate)  userData.weekdayRate  = Number(weekdayRate);
      if (saturdayRate) userData.saturdayRate = Number(saturdayRate);
      if (sundayRate)   userData.sundayRate   = Number(sundayRate);
      if (nidNumber) userData.nidNumber = nidNumber;
      if (bmdc) userData.bmdc = bmdc;
      if (bnmc) userData.bnmc = bnmc;
      if (bkashNumber) userData.bkashNumber = bkashNumber;
      if (nagadNumber) userData.nagadNumber = nagadNumber;

      if (location) {
        try { userData.location = JSON.parse(location); } catch { /* ignore malformed location */ }
      }
      if (availability) {
        try { userData.availability = JSON.parse(availability); } catch { /* ignore malformed availability */ }
      }

      const files = req.files || {};
      if (files.profilePhoto)      userData.profilePhoto      = files.profilePhoto[0].path;
      if (files.idDocument)        userData.idDocument        = files.idDocument[0].path;
      if (files.policeClearance)   userData.policeClearance   = files.policeClearance[0].path;
      if (files.courseCertificate) userData.courseCertificate = files.courseCertificate[0].path;
    }

    if (!settings) settings = await Settings.create({});

    // Starting credits are only granted while the admin has the "Free
    // Credits Enabled" setting on - when it's off, new accounts start at 0
    // regardless of role.
    const startingCredits = settings.freeCreditsEnabled
      ? (userData.role === 'professional' ? (settings.freeCreditsAmount ?? 0) : (settings.customerFreeCredits ?? 10))
      : 0;

    const user = new User({ ...userData, credits: startingCredits, totalCreditsReceived: startingCredits });
    await user.save();

    if (startingCredits > 0) {
      await CreditTransaction.create({
        professional: user._id,
        type: 'bonus',
        credits: startingCredits,
        note: 'Welcome bonus',
      });
    }

    const prefix = user.name.split(' ')[0].toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    user.referralCode = prefix + suffix;
    await user.save();

    // referralCode is sent explicitly in the register form (cross-origin cookies
    // between the Vercel frontend and Render backend are not reliable), falling
    // back to the cookie for the direct /api/auth/ref/:code redirect flow.
    const refCode = referralCodeFromBody || req.cookies?.referralCode;
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode });
      if (referrer && String(referrer._id) !== String(user._id)) {
        user.referredBy = referrer._id;
        await user.save();
        referrer.referralCount += 1;
        referrer.referralScore += 10;
        if (settings?.creditsEnabled) {
          referrer.credits += 1;
          referrer.totalCreditsReceived = (referrer.totalCreditsReceived || 0) + 1;
          await CreditTransaction.create({
            professional: referrer._id,
            type: 'bonus',
            credits: 1,
            note: 'Referral bonus - someone joined using your link'
          });
        }
        await referrer.save();
        await createNotification({
          userId: referrer._id,
          type: 'admin',
          message: user.name + ' joined Carely using your referral link! Your ranking improved.' + (settings?.creditsEnabled ? ' +1 credit added.' : ''),
          link: '/edit-profile',
          io: req.io,
        });
      }
    }

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

router.get('/ref/:code', (req, res) => {
  res.cookie('referralCode', req.params.code, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax'
  });
  res.redirect(process.env.FRONTEND_URL + '/register?ref=' + req.params.code);
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // Maintenance mode blocks regular users but never locks out admin - they
    // need to be able to log in to turn it back off.
    if (user.role !== 'admin') {
      const settings = await Settings.findOne();
      if (settings?.maintenanceMode) {
        return res.status(503).json({
          message: settings.maintenanceMessage || 'Carely is currently undergoing scheduled maintenance. Please check back soon.',
        });
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Always responds with this exact neutral message, whether or not the email
// is registered, whether the send succeeded, throttled, or errored - the
// response must never be a signal an attacker can use to enumerate accounts.
const FORGOT_PASSWORD_NEUTRAL = { message: 'If an account exists, a reset link has been sent.' };

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.json(FORGOT_PASSWORD_NEUTRAL);
    if (isForgotPasswordRateLimited(email)) return res.json(FORGOT_PASSWORD_NEUTRAL);

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
      await user.save();

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your password - Carely',
          title: 'Reset your password',
          content:
            '<p style="color:#1A1A2E;font-size:14px;line-height:1.7;">We received a request to reset your Carely password.</p>' +
            '<div style="margin-top:16px;text-align:center;">' +
            emailButton('Reset your password', resetUrl) +
            '</div>' +
            '<p style="margin-top:20px;color:#64748B;font-size:12px;">This link expires in 1 hour. If you didn\'t request this, ignore this email - your password will stay the same.</p>',
        });
      } catch (err) {
        // A failed send must not change the response - that would leak
        // whether the email existed (existing account -> send attempted /
        // errored vs. unknown account -> never attempted).
        console.error('Password reset email failed to send:', err.message);
      }
    }

    res.json(FORGOT_PASSWORD_NEUTRAL);
  } catch (err) {
    res.json(FORGOT_PASSWORD_NEUTRAL);
  }
});

router.post('/reset-password', async (req, res) => {
  const INVALID = { message: 'This reset link is invalid or has expired. Please request a new one.' };
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json(INVALID);
    }
    if (!tokensMatch(user.resetPasswordToken, hashToken(token))) {
      return res.status(400).json(INVALID);
    }

    // Assign the PLAIN password - User's pre-save hook hashes any modified
    // `password` field on save. Hashing it here too would double-hash and
    // silently break login (the exact bug this flow avoided in resetAdmin.js).
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    createNotification({
      userId: user._id,
      type: 'admin',
      message: "Your password was changed. If this wasn't you, contact support immediately.",
      link: '/edit-profile',
      io: req.io,
    }).catch(() => {});

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed. Please try again.' });
  }
});

module.exports = router;
