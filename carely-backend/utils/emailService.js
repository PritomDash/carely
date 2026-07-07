const nodemailer = require('nodemailer');

// Explicit host/port 587 + STARTTLS instead of `service: 'gmail'` (which
// defaults to port 465/SSL) - some hosts block outbound 465 but allow 587.
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

const emailTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #F7FAFF; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2B7FFF, #60A5FA); padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 15px; }
    .body { padding: 32px 40px; }
    .detail-row { display: flex; border-bottom: 1px solid #F1F5F9; padding: 12px 0; }
    .detail-label { color: #64748B; font-size: 14px; width: 160px; flex-shrink: 0; font-weight: 600; }
    .detail-value { color: #1A1A2E; font-size: 14px; font-weight: 500; }
    .footer { background: #F7FAFF; padding: 20px 40px; text-align: center; color: #94A3B8; font-size: 12px; }
    .disclaimer { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 16px; margin-top: 20px; color: #7F1D1D; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💙 Carely</h1>
      <p>${title}</p>
    </div>
    <div class="body">
      ${content}
      <div class="disclaimer">
        ⚠️ Carely is a marketplace platform only. Always verify professional identity before allowing access to your home. Carely is not responsible for any service outcome.
      </div>
    </div>
    <div class="footer">
      <p>© 2025 Carely Bangladesh | <a href="${process.env.FRONTEND_URL}/terms">Terms</a> | <a href="${process.env.FRONTEND_URL}/privacy">Privacy</a></p>
    </div>
  </div>
</body>
</html>
`;

// Returns {success, error?} so diagnostic callers (e.g. the admin test-email
// route) can report real status. Existing fire-and-forget callers ignore the
// return value, so this is safe to add without changing their behavior.
const sendEmail = async ({ to, subject, title, content }) => {
  if (!to) return { success: false, error: 'No recipient address provided' };
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, error: 'EMAIL_USER/EMAIL_PASS not configured on the server' };
  }
  try {
    await transporter.sendMail({
      from: `Carely Bangladesh <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: emailTemplate(title, content)
    });
    console.log('Email sent to:', to);
    return { success: true };
  } catch (err) {
    console.error('Email failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Emails must never block the caller's response - SMTP delivery can be slow
// or hang entirely (e.g. blocked egress on the hosting provider). Fire-and-
// forget with an internal catch so a stuck send can't stall the main action.
const fireEmail = (opts) => {
  sendEmail(opts).catch((err) => console.error('Email send failed:', err.message));
};

const detailRow = (label, value) =>
  '<div class="detail-row"><div class="detail-label">' + label + '</div><div class="detail-value">' + value + '</div></div>';

module.exports = { sendEmail, fireEmail, detailRow };
