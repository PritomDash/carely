const { Resend } = require('resend');

// Render (and many hosts) block outbound raw SMTP (465/587) entirely, so
// Gmail SMTP times out on every send regardless of credentials - confirmed
// via GET /api/admin/test-email. Resend sends over HTTPS (443), which is
// never blocked. See EMAIL_SETUP_NEEDED.md for how to get an API key.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
// return value, so this is safe without changing their behavior.
const sendEmail = async ({ to, subject, title, content }) => {
  if (!to) return { success: false, error: 'No recipient address provided' };
  if (!resend) {
    const msg = 'RESEND_API_KEY not configured - email not sent. See EMAIL_SETUP_NEEDED.md.';
    console.error(msg);
    return { success: false, error: msg };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Carely Bangladesh <onboarding@resend.dev>',
      to: [to],
      subject,
      html: emailTemplate(title, content),
    });
    if (error) {
      console.error('Resend email failed:', error.message || error);
      return { success: false, error: error.message || String(error) };
    }
    console.log('Email sent via Resend to:', to, data?.id ? '(' + data.id + ')' : '');
    return { success: true };
  } catch (err) {
    console.error('Resend email failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Emails must never block the caller's response - delivery can be slow or
// fail entirely. Fire-and-forget with an internal catch so a stuck/failed
// send can't stall the main action.
const fireEmail = (opts) => {
  sendEmail(opts).catch((err) => console.error('Email send failed:', err.message));
};

const detailRow = (label, value) =>
  '<div class="detail-row"><div class="detail-label">' + label + '</div><div class="detail-value">' + value + '</div></div>';

module.exports = { sendEmail, fireEmail, detailRow };
