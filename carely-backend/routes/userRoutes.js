const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');
const User = require('../models/user');
const { findNearbyProfessionals } = require('../utils/nearbySearch');
const { isValidBDPhone } = require('../utils/phoneValidation');
const { createNotification } = require('../utils/notificationService');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Lightweight liveness/install ping, fired once per app session load (not on
// every route change). Doubles as our install-tracking signal since GA4
// can't tell us which of our own users actually installed the PWA.
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    const update = { lastActiveAt: new Date() };
    if (req.body.standalone === true && !req.user.hasInstalledApp) {
      update.hasInstalledApp = true;
      update.appInstalledAt = new Date();
    }
    await User.findByIdAndUpdate(req.user._id, update);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, experience, availability, location, about,
            weekdayRate, saturdayRate, sundayRate, hourlyRate,
            bkashNumber, nagadNumber, payoutMethod, bankDetails } = req.body;

    if (phone !== undefined && !isValidBDPhone(phone)) {
      return res.status(400).json({ message: 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)' });
    }

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

    const allProfessionals = await User.find(query).select('-password');
    const hasLocationFilter = !!(division || district || thana);

    const applySearch = (list) => {
      if (!search) return list;
      const s = search.toLowerCase();
      return list.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.about || '').toLowerCase().includes(s) ||
        (p.experience || '').toLowerCase().includes(s)
      );
    };

    let professionals = allProfessionals;
    // Never dead-end on an empty search. findNearbyProfessionals already
    // matches on thana OR district OR division in one pass (each pro's
    // location.division is checked regardless of whether their thana or
    // district also matched), so a thana-specific search already silently
    // includes district/division-level results - a search only ever comes
    // back with 0 results when literally nobody of that service type is
    // registered anywhere in the whole division. The only meaningful widen
    // left at that point is to drop the location filter entirely and show
    // that service type nationwide, rather than a blank screen.
    let widenedTo = null;

    if (hasLocationFilter) {
      professionals = applySearch(findNearbyProfessionals(allProfessionals, { division, district, thana }, serviceType));

      if (professionals.length === 0) {
        professionals = applySearch(allProfessionals);
        widenedTo = 'nationwide';
      }
    } else {
      professionals = applySearch(professionals);
    }

    const locationScore = (pro) => {
      if (!pro.location) return 0;
      if (thana && pro.location.thana === thana) return 3;
      if (district && pro.location.district === district) return 2;
      if (division && pro.location.division === division) return 1;
      return 0;
    };

    const now = Date.now();
    const isActiveFeatured = (p) => !!(p.isFeatured && p.featuredUntil && new Date(p.featuredUntil).getTime() > now);

    // Bayesian average pulls a brand-new professional's rating toward 3.5
    // instead of 0, so one unrated (or unlucky first-review) professional
    // isn't buried at the bottom of the quality tier forever just for being
    // new - the weight of 3 "phantom" reviews fades out fast as real
    // reviews accumulate.
    const effectiveRating = (p) => {
      const reviewCount = p.ratings?.length || 0;
      return ((3.5 * 3) + ((p.rating || 0) * reviewCount)) / (3 + reviewCount);
    };
    const qualityScore = (p) => effectiveRating(p) * 10 + (p.completedBookingsCount || 0) + (p.referralScore || 0);

    // Exactly one sort, on three keys in this order: location tier, then
    // boost, then quality. Boost buys top-of-your-own-area, not
    // top-of-country - a boosted pro two tiers away must never outrank a
    // non-boosted pro in the customer's own thana. A previous version of
    // this sort checked boost before location, which let a boosted
    // professional in a different district beat a closer non-boosted one;
    // do not reorder these keys.
    professionals.sort((a, b) => {
      if (hasLocationFilter) {
        const proximityDiff = locationScore(b) - locationScore(a);
        if (proximityDiff !== 0) return proximityDiff;
      }

      const aFeatured = isActiveFeatured(a);
      const bFeatured = isActiveFeatured(b);
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;

      return qualityScore(b) - qualityScore(a);
    });

    res.json({ professionals, widenedTo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch professionals' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const top = await User.find({ role: 'professional' })
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

// One-time push + in-app "note from the founder" for new professionals - the
// frontend calls this ~20-30s after registration/first login. Idempotent via
// founderWelcomeNotifiedAt so a re-armed client-side timer (e.g. after a
// fresh page load) can never send it twice. Intentionally push + in-app
// only, no email - see the "add free founder welcome" feature.
router.post('/founder-welcome-notify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professional') return res.status(403).json({ message: 'Not applicable' });
    if (req.user.founderWelcomeNotifiedAt) return res.json({ sent: false });

    await User.findByIdAndUpdate(req.user._id, { founderWelcomeNotifiedAt: new Date() });
    await createNotification({
      userId: req.user._id,
      type: 'admin',
      message: 'A personal note from the founder is waiting — tap to read.',
      link: '/home',
      pushTitle: 'Welcome to Carely 💙',
      io: req.io,
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send founder welcome' });
  }
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
