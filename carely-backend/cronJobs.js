const cron = require('node-cron');
const Booking = require('./models/Booking');
const JobPost = require('./models/JobPost');
const Notification = require('./models/Notification');
const User = require('./models/user');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendEmail = async ({ to, subject, html }) => {
  if (!to) return;
  try { await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html }); }
  catch (e) { console.error('Email failed:', e.message); }
};

function setupCronJobs() {
  console.log('✅ Cron jobs started');

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

        await Notification.create({
          user: b.customer._id, type: 'booking',
          message: 'Your booking was auto-declined. ' + (b.professional?.name || 'The professional') + ' did not respond within 24 hours. Please try another professional.',
          link: '/my-bookings'
        });

        await sendEmail({
          to: b.customer?.email,
          subject: 'Booking Auto-Declined - Carely',
          html:
            '<p>' + (b.professional?.name || 'The professional') + ' did not respond to your booking request within 24 hours.</p>' +
            '<p>Your booking has been automatically declined.</p>' +
            '<p>Please try booking another professional.</p>'
        });
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
        await Notification.create({
          user: p.customer._id, type: 'jobpost',
          message: 'Your job post "' + p.title + '" has expired.',
          link: '/my-posts'
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
        await Notification.create({
          user: pro._id, type: 'payment',
          message: 'You have only ' + pro.credits + ' credit(s) left. Top up to keep accepting bookings.',
          link: '/my-credits'
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

  // Every Sunday at 3am: Delete inactive professional accounts (3+ months since last update)
  cron.schedule('0 3 * * 0', async () => {
    try {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveUsers = await User.find({
        role: 'professional',
        updatedAt: { $lt: threeMonthsAgo },
        isVerified: true
      });

      for (const user of inactiveUsers) {
        await Booking.deleteMany({ $or: [{ customer: user._id }, { professional: user._id }] });
        await Notification.deleteMany({ user: user._id });
        await User.findByIdAndDelete(user._id);
      }
      if (inactiveUsers.length > 0) {
        console.log('Deleted ' + inactiveUsers.length + ' inactive professionals');
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
}

module.exports = setupCronJobs;
