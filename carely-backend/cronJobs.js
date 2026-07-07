const cron = require('node-cron');
const Booking = require('./models/Booking');
const JobPost = require('./models/JobPost');
const User = require('./models/user');
const { createNotification } = require('./utils/notificationService');

function setupCronJobs(io) {
  console.log('✅ Cron jobs started');

  // Every 14 minutes: self-ping so Render's free tier never spins down from
  // inactivity (it sleeps after ~15 min with no inbound traffic). Prefers
  // Render's own RENDER_EXTERNAL_URL (auto-set on every Render web service)
  // over BACKEND_URL so this can't drift out of sync with the real host.
  cron.schedule('*/14 * * * *', async () => {
    try {
      const axios = require('axios');
      const base = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'http://localhost:5000';
      const res = await axios.get(base + '/', { timeout: 10000 });
      console.log('Self-ping OK:', res.status, new Date().toISOString());
    } catch (err) {
      console.error('Self-ping failed:', err.message);
    }
  });

  // Every hour: Auto-decline bookings not accepted in 24h
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const bookings = await Booking.find({
        status: 'AwaitingAcceptance',
        createdAt: { $lt: cutoff }
      }).populate('customer professional');

      for (const b of bookings) {
        b.status = 'Auto-Declined';
        b.isActive = false;
        b.sessions = [];
        await b.save();

        await createNotification({
          userId: b.customer._id, type: 'booking',
          message: 'Your booking was auto-declined. ' + (b.professional?.name || 'The professional') + ' did not respond within 24 hours. Please try another professional.',
          link: '/my-bookings',
          io,
        });

        // Booking status update - push + in-app only, no email (see routing
        // table in SETUP_KEYS_NEEDED.md).
      }
      if (bookings.length > 0) console.log('Auto-declined ' + bookings.length + ' bookings');
    } catch (err) { console.error('Auto-decline cron error:', err.message); }
  });

  // Every hour: Expire job posts older than 7 days
  cron.schedule('15 * * * *', async () => {
    try {
      const posts = await JobPost.find({
        status: 'Open',
        expiresAt: { $lte: new Date() }
      }).populate('customer');

      for (const p of posts) {
        p.status = 'Expired';
        await p.save();
        await createNotification({
          userId: p.customer._id, type: 'jobpost',
          message: 'Your job post "' + p.title + '" has expired.',
          link: '/my-posts',
          io,
        });
      }
    } catch (err) { console.error('Expire posts cron error:', err.message); }
  });

  // Every day midnight: Low credit warning
  cron.schedule('0 0 * * *', async () => {
    try {
      const Settings = require('./models/Settings');
      const settings = await Settings.findOne();
      if (!settings?.creditsEnabled) return;

      const pros = await User.find({ role: 'professional', isVerified: true, credits: { $lte: 2, $gt: 0 } });
      for (const pro of pros) {
        await createNotification({
          userId: pro._id, type: 'payment',
          message: 'You have only ' + pro.credits + ' credit(s) left. Top up to keep accepting bookings.',
          link: '/my-credits',
          io,
        });
      }
    } catch (err) { console.error('Credit warning cron error:', err.message); }
  });

  const DOC_FIELDS = ['idDocument', 'passport', 'policeClearance', 'courseCertificate', 'studentID'];

  const deleteDocFiles = async (user) => {
    const path = require('path');
    const fs = require('fs');
    for (const field of DOC_FIELDS) {
      if (user[field]) {
        const filePath = path.join(__dirname, 'uploads', 'documents', path.basename(user[field]));
        fs.promises.unlink(filePath).catch(() => {});
        user[field] = null;
      }
    }
    await user.save();
  };

  // Every day at 2am: Delete verification documents older than 15 days (profile photos kept)
  cron.schedule('0 2 * * *', async () => {
    try {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const users = await User.find({
        documentUploadedAt: { $lt: fifteenDaysAgo },
        $or: DOC_FIELDS.map((field) => ({ [field]: { $ne: null } }))
      });

      for (const user of users) {
        await deleteDocFiles(user);
      }
      console.log('Old documents cleaned - profile photos kept');
    } catch (err) {
      console.error('Document cleanup error:', err.message);
    }
  });

  // Every Sunday at 3am: for professionals inactive 3+ months, clear their
  // verification documents for storage management - but the account,
  // bookings, notifications, and profile photo are NEVER deleted. Profile
  // photos are essential for the marketplace to work and must be kept
  // permanently; only verification documents are ever storage-managed.
  cron.schedule('0 3 * * 0', async () => {
    try {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveUsers = await User.find({
        role: 'professional',
        updatedAt: { $lt: threeMonthsAgo },
        isVerified: true,
        $or: DOC_FIELDS.map((field) => ({ [field]: { $ne: null } }))
      });

      for (const user of inactiveUsers) {
        await deleteDocFiles(user);
      }
      if (inactiveUsers.length > 0) {
        console.log('Cleared verification documents for ' + inactiveUsers.length + ' inactive professionals - accounts and profile photos kept');
      }
    } catch (err) {
      console.error('Inactive user cleanup error:', err.message);
    }
  });

  // Every day at 4am: Check disk usage and clean oldest documents if storage getting full
  cron.schedule('0 4 * * *', async () => {
    try {
      const { execSync } = require('child_process');
      const result = execSync("df / | tail -1 | awk '{print $5}'").toString().trim().replace('%', '');
      const usagePercent = parseInt(result, 10);

      if (usagePercent > 80) {
        console.log('Disk usage ' + usagePercent + '% - cleaning old documents');
        const users = await User.find({
          $or: ['idDocument', 'passport', 'policeClearance'].map((field) => ({ [field]: { $ne: null } }))
        }).sort({ documentUploadedAt: 1 }).limit(20);

        for (const user of users) {
          await deleteDocFiles(user);
        }
      }
    } catch (err) {
      console.error('Disk check error:', err.message);
    }
  });

  // Every day at 1am: Expire featured profiles past their featuredUntil date
  cron.schedule('0 1 * * *', async () => {
    await User.updateMany(
      { isFeatured: true, featuredUntil: { $lte: new Date() } },
      { isFeatured: false, featuredUntil: null }
    );
    console.log('Expired featured profiles cleaned');
  });
}

module.exports = setupCronJobs;
