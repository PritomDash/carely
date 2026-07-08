const { Resend } = require('resend');
const SibApiV3Sdk = require('@getbrevo/brevo');
const sgMail = require('@sendgrid/mail');

// Render (and many hosts) block outbound raw SMTP (465/587) entirely, so
// Gmail SMTP times out on every send regardless of credentials - confirmed
// via GET /api/admin/test-email. All three providers below send over HTTPS,
// which is never blocked. See EMAIL_KEYS_NEEDED.md for how to get each key.
//
// Falls through Brevo -> Resend -> SendGrid so a single provider being down,
// misconfigured, or over its free-tier daily/monthly cap doesn't stop email
// entirely - combined free capacity across all three is ~15,000/month. Brevo
// goes first since it uses the verified carely.help@gmail.com sender.
const FROM_EMAIL = process.env.EMAIL_FROM || 'Carely <carely.help@gmail.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'carely.help@gmail.com';

const emailTemplate = (title, content) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#F7FAFF;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563EB,#3B82F6);padding:32px 40px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">💙 Carely</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">${title}</p>
    </div>
    <div style="padding:32px 40px;">
      ${content}
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;margin-top:20px;color:#7F1D1D;font-size:12px;line-height:1.6;">
        ⚠️ Carely is a marketplace platform only. Always verify professional identity before allowing access to your home. Carely is not responsible for any service outcome.
      </div>
    </div>
    <div style="background:#F7FAFF;padding:20px 40px;text-align:center;color:#94A3B8;font-size:12px;">
      © 2025 Carely Bangladesh · <a href="${process.env.FRONTEND_URL}/terms" style="color:#2563EB;">Terms</a> · <a href="${process.env.FRONTEND_URL}/privacy" style="color:#2563EB;">Privacy</a>
    </div>
  </div>
</body></html>
`;

const detailRow = (label, value) =>
  '<div class="detail-row"><div class="detail-label">' + label + '</div><div class="detail-value">' + value + '</div></div>';

// Provider 1: Resend
const sendViaResend = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) throw new Error('Resend not configured');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    reply_to: REPLY_TO,
  });
  if (result.error) throw new Error('Resend: ' + JSON.stringify(result.error));
  return { provider: 'resend', id: result.data?.id };
};

// Provider 2: Brevo
const sendViaBrevo = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY) throw new Error('Brevo not configured');
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = { email: process.env.BREVO_FROM_EMAIL || 'carely.help@gmail.com', name: 'Carely' };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.replyTo = { email: REPLY_TO };
  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  return { provider: 'brevo', id: result.body?.messageId || result.messageId };
};

// Provider 3: SendGrid
const sendViaSendGrid = async ({ to, subject, html }) => {
  if (!process.env.SENDGRID_API_KEY) throw new Error('SendGrid not configured');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const result = await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@carely.com',
    replyTo: REPLY_TO,
    subject,
    html,
  });
  return { provider: 'sendgrid', id: result[0]?.headers?.['x-message-id'] };
};

const providers = [sendViaBrevo, sendViaResend, sendViaSendGrid];

// Returns {success, provider?, id?, error?/errors?} so diagnostic callers
// (the admin test-email route) can report real status. Existing
// fire-and-forget callers (fireEmail) ignore the return value.
const sendEmail = async ({ to, subject, title, content }) => {
  if (!to) return { success: false, error: 'No recipient address provided' };

  const html = emailTemplate(title, content);
  const errors = [];

  for (const provider of providers) {
    try {
      const result = await Promise.race([
        provider({ to, subject, html }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
      ]);
      console.log('✅ Email sent via', result.provider, 'to', to);
      return { success: true, ...result };
    } catch (err) {
      errors.push(provider.name.replace('sendVia', '') + ': ' + err.message);
      console.log('⚠️ Email provider failed, trying next:', err.message);
    }
  }

  console.error('❌ All email providers failed for', to, ':', errors);
  return { success: false, errors };
};

// Emails must never block the caller's response - delivery can be slow or
// fail entirely. Fire-and-forget with an internal catch so a stuck/failed
// send can't stall the main action (booking, top-up, etc. always succeeds
// regardless of whether the email actually goes out).
const fireEmail = (opts) => {
  sendEmail(opts).catch((err) => console.error('Email send failed:', err.message));
};

module.exports = { sendEmail, fireEmail, detailRow };
