const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const CreditTransaction = require('../models/CreditTransaction');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (googleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.BACKEND_URL + '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        const startingCredits = settings.customerFreeCredits ?? 10;

        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: 'google_' + Math.random().toString(36),
          phone: '01000000000',
          role: 'customer',
          isVerified: true,
          profileApproved: true,
          profilePhoto: profile.photos[0]?.value || null,
          credits: startingCredits,
          totalCreditsReceived: startingCredits,
        });

        await CreditTransaction.create({
          professional: user._id,
          type: 'bonus',
          credits: startingCredits,
          note: 'Welcome bonus',
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

router.get('/google', (req, res, next) => {
  if (!googleConfigured) {
    return res.status(503).json({ message: 'Google login is not configured yet.' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.status(503).json({ message: 'Google login is not configured yet.' });
  }
  return passport.authenticate('google', {
    session: false,
    failureRedirect: process.env.FRONTEND_URL + '/login?error=google_failed'
  })(req, res, next);
}, (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const payload = JSON.stringify({ token, user: req.user }).replace(/</g, '\\u003c');
  res.send(
    '<script>window.opener.postMessage(' + payload + ', "' + process.env.FRONTEND_URL + '"); window.close();</script>'
  );
});

module.exports = router;
