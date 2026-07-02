const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');
const User = require('../models/user');
const { findNearbyProfessionals } = require('../utils/nearbySearch');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, experience, availability, location, about,
            weekdayRate, saturdayRate, sundayRate, hourlyRate,
            bkashNumber, nagadNumber, payoutMethod, bankDetails } = req.body;

    const num = (v) => (v === "" || v == null ? 0 : Number(v));

    const updateData = {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(experience !== undefined && { experience }),
      ...(about !== undefined && { about }),
      ...(location !== undefined && { location }),
      ...(availability !== undefined && { availability }),
      weekdayRate:  num(weekdayRate),
      saturdayRate: num(saturdayRate),
      sundayRate:   num(sundayRate),
      hourlyRate:   num(hourlyRate),
      ...(bkashNumber !== undefined && { bkashNumber }),
      ...(nagadNumber !== undefined && { nagadNumber }),
      ...(payoutMethod !== undefined && { payoutMethod }),
      ...(bankDetails !== undefined && { bankDetails }),
    };

    const updated = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
});

router.post('/documents', authMiddleware, upload.fields([
  { name: 'idDocument' },
  { name: 'passport' },
  { name: 'policeClearance' },
  { name: 'courseCertificate' },
  { name: 'profilePhoto' },
  { name: 'studentID' },
  { name: 'introVideo' },
]), async (req, res) => {
  try {
    const update = {};
    const files = req.files || {};
    if (files.idDocument)      update.idDocument      = files.idDocument[0].path;
    if (files.passport)        update.passport        = files.passport[0].path;
    if (files.policeClearance) update.policeClearance = files.policeClearance[0].path;
    if (files.courseCertificate) update.courseCertificate = files.courseCertificate[0].path;
    if (files.profilePhoto)    update.profilePhoto    = files.profilePhoto[0].path;
    if (files.studentID)       update.studentID       = files.studentID[0].path;
    if (files.introVideo)      update.introVideo      = files.introVideo[0].path;

    if (req.body.nidNumber) update.nidNumber = req.body.nidNumber;
    if (req.body.bmdc)      update.bmdc      = req.body.bmdc;
    if (req.body.bnmc)      update.bnmc      = req.body.bnmc;

    const docFieldsUploaded = ['idDocument', 'passport', 'policeClearance', 'courseCertificate', 'studentID']
      .some((field) => files[field]);
    if (docFieldsUploaded) update.documentUploadedAt = new Date();

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ message: 'Documents uploaded', user });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

router.get('/professionals', async (req, res) => {
  try {
    const { division, district, thana, serviceType, search } = req.query;
    let query = { role: 'professional' };

    if (serviceType) query.professionalType = serviceType;

    let professionals = await User.find(query).select('-password');

    if (division || district || thana) {
      professionals = findNearbyProfessionals(
        professionals,
        { division, district, thana },
        serviceType
      );
    }

    if (search) {
      const s = search.toLowerCase();
      professionals = professionals.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.about || '').toLowerCase().includes(s) ||
        (p.experience || '').toLowerCase().includes(s)
      );
    }

    professionals.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      const scoreA = (a.referralScore || 0) + (a.rating || 0) * 10 + (a.ratings?.length || 0);
      const scoreB = (b.referralScore || 0) + (b.rating || 0) * 10 + (b.ratings?.length || 0);
      return scoreB - scoreA;
    });

    res.json(professionals);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch professionals' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const top = await User.find({ role: 'professional', isVerified: true })
      .select('name profilePhoto rating referralCount referralScore professionalType isFeatured location')
      .sort({ referralScore: -1, rating: -1 })
      .limit(10);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/all-professionals', async (req, res) => {
  try {
    const pros = await User.find({ role: 'professional' }).select('-password');
    res.json(pros);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch professionals' });
  }
});

router.post('/push-subscription', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
