const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const CreditTransaction = require('../models/CreditTransaction');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Allowed popup-opener origins for the Google OAuth postMessage handoff.
// Both the new custom domain and the old default Vercel URL are allowed
// during the migration so logins from either still work; remove the old
// URL once nothing links to it anymore. FRONTEND_URL is always allowed too.
const ALLOWED_FRONTEND_ORIGINS = [
  'https://mycarely.app',
  'https://carely-tan.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const resolveOrigin = (candidate) =>
  ALLOWED_FRONTEND_ORIGINS.includes(candidate) ? candidate : (process.env.FRONTEND_URL || ALLOWED_FRONTEND_ORIGINS[0]);

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
        // Same rule as email/password registration: only grant a starting
        // balance while "Free Credits Enabled" is on.
        const startingCredits = settings.freeCreditsEnabled ? (settings.customerFreeCredits ?? 10) : 0;

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

        if (startingCredits > 0) {
          await CreditTransaction.create({
            professional: user._id,
            type: 'bonus',
            credits: startingCredits,
            note: 'Welcome bonus',
          });
        }
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
  // Remember which frontend origin opened the popup (validated against the
  // allow-list) so the callback can hand the token back to the right one.
  const origin = resolveOrigin(req.query.origin);
  res.cookie('oauth_origin', origin, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: 'lax' });
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.status(503).json({ message: 'Google login is not configured yet.' });
  }
  const origin = resolveOrigin(req.cookies?.oauth_origin);
  res.clearCookie('oauth_origin');
  return passport.authenticate('google', {
    session: false,
    failureRedirect: origin + '/login?error=google_failed'
  })(req, res, next);
}, (req, res) => {
  const origin = resolveOrigin(req.cookies?.oauth_origin);
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '90d' });
  const payload = JSON.stringify({ token, user: req.user }).replace(/</g, '\\u003c');
  res.send(
    '<script>window.opener.postMessage(' + payload + ', "' + origin + '"); window.close();</script>'
  );
});

module.exports = router;
