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
          message: 'Your booking was not accepted in time and has been auto-declined.',
          link: '/my-bookings'
        });

        await sendEmail({
          to: b.customer?.email,
          subject: 'Booking Auto-Declined - Carely',
          html: '<p>Hi ' + (b.customer?.name || '') + ',</p><p>Your booking request with <b>' + (b.professional?.name || '') + '</b> was not accepted within 24 hours and has been automatically declined.</p><p>Please try booking another professional.</p>'
        });
      }
      if (bookings.length > 0) console.log('Auto-declined ' + bookings.length + ' bookings');
    } catch (err) { console.error('Auto-decline cron error:', err.message); }
  });

  // Every hour: Auto-release payout after 24h if no dispute
  cron.schedule('30 * * * *', async () => {
    try {
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const bookings = await Booking.find({
        status: 'Completed',
        taskCompletedEmailSent: true,
        taskConfirmedByCustomer: false,
        refundRequested: false,
        payoutStatus: 'Pending',
        taskEmailSentTime: { $lte: threshold }
      }).populate('professional');

      for (const b of bookings) {
        b.payoutStatus = 'Released';
        b.taskConfirmedByCustomer = true;
        b.isActive = false;
        b.sessions = [];
        await b.save();

        await Notification.create({
          user: b.professional._id, type: 'payment',
          message: 'Payout for your booking has been approved. Admin will process it shortly.',
          link: '/earnings'
        });
      }
      if (bookings.length > 0) console.log('Auto-released ' + bookings.length + ' payouts');
    } catch (err) { console.error('Auto-release cron error:', err.message); }
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
}

module.exports = setupCronJobs;
