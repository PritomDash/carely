const webpush = require('web-push');

// setVapidDetails throws synchronously on missing/invalid keys, which would
// crash the whole server at boot before VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY
// are configured on Render. Only wire it up once real keys are present.
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@carely.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const sendPushNotification = async ({ subscription, title, body, link }) => {
  if (!subscription || !process.env.VAPID_PUBLIC_KEY) return;
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, link: link || '/my-bookings', icon: '/icon-192.png' })
    );
    console.log('Push sent to:', subscription.endpoint?.slice(0, 40));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('Subscription expired - should remove from DB');
    } else {
      console.error('Push failed:', err.message);
    }
  }
};

module.exports = { sendPushNotification };
