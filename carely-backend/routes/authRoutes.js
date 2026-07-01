const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { upload } = require('../middlewares/uploadMiddleware');

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

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
    } = req.body;

    if (!name || !email || !password || !phone || !role)
      return res.status(400).json({ message: 'All fields are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const userData = { name, email, password, phone, role: role.toLowerCase() };

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

    const user = new User(userData);
    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account with that email' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = process.env.APP_BASE_URL + '/reset-password/' + token;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset - Carely',
      html: '<p>Click <a href="' + resetUrl + '">here</a> to reset your password. Link expires in 1 hour.</p>'
    });

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send reset email' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed' });
  }
});

module.exports = router;
