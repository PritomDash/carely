const { Resend } = require('resend');
const { BrevoClient } = require('@getbrevo/brevo');
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
const APP_URL = process.env.FRONTEND_URL || 'https://mycarely.app';

const STATUS_COLORS = {
  Confirmed: { bg: '#DCFCE7', text: '#15803D' },
  Pending:   { bg: '#FEF3C7', text: '#92400E' },
  Declined:  { bg: '#FEE2E2', text: '#991B1B' },
  Cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  Completed: { bg: '#DBEAFE', text: '#1D4ED8' },
};

// A colored pill at the top of the body showing booking/request state at a
// glance, e.g. statusPill('Confirmed'). Table-based (not flexbox) so it
// renders identically in Outlook, which uses Word's layout engine and
// ignores most modern CSS.
const statusPill = (label) => {
  const c = STATUS_COLORS[label] || STATUS_COLORS.Pending;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td style="background:${c.bg};color:${c.text};font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;text-transform:uppercase;letter-spacing:0.5px;">${label}</td></tr>
  </table>`;
};

// Table-based label/value row (thin divider between rows) instead of the
// old flexbox-div version, which silently relied on CSS classes
// (.detail-row/.detail-label/.detail-value) that were never actually
// defined anywhere in the template - every detail row rendered completely
// unstyled. Tables are used because Outlook's Word rendering engine does
// not support flexbox/grid at all.
const detailRow = (label, value) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #F1F5F9;">
    <tr>
      <td style="padding:10px 0;color:#64748B;font-size:14px;width:40%;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;color:#1A1A2E;font-size:14px;font-weight:600;text-align:right;vertical-align:top;">${value}</td>
    </tr>
  </table>`;

// Reusable call-to-action button for email templates. Buttons deep-link
// into the app to the page where the relevant action lives - they never
// perform the action themselves from the email/link, since anyone who
// forwards or intercepts the link could otherwise trigger it. The user
// always has to open the app and tap confirm there. Table-wrapped ("
// bulletproof button" pattern) so the background color and padding survive
// in Outlook desktop, which otherwise tends to collapse anchor padding.
const emailButton = (text, url, color = '#2563EB') => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 4px;display:inline-block;">
    <tr>
      <td style="background:${color};border-radius:10px;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">${text}</a>
      </td>
    </tr>
  </table>`;

// Extremely small module - strips tags for a plain-text fallback. Not meant
// to be a full HTML->text renderer, just a readable degrade for clients/
// spam filters that prefer or require a text/plain part.
const htmlToText = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const emailTemplate = (title, content, status) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:linear-gradient(135deg,#1D4ED8,#2563EB);padding:32px 40px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
          <tr>
            <td style="vertical-align:middle;padding-right:8px;">
              <img src="${APP_URL}/icon-192.png" width="32" height="32" alt="" style="border-radius:8px;display:block;">
            </td>
            <td style="vertical-align:middle;">
              <span style="color:#ffffff;font-size:24px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Carely</span>
            </td>
          </tr>
        </table>
        <p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">${title}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px;font-size:15px;line-height:1.7;color:#374151;">
        ${status ? statusPill(status) : ''}
        ${content}
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;margin-top:24px;color:#7F1D1D;font-size:12px;line-height:1.6;">
          Meet in a safe place. Verify identity before letting anyone into your home. Carely is a marketplace only and does not verify professionals.
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#F8FAFC;padding:20px 40px;text-align:center;color:#94A3B8;font-size:12px;line-height:1.8;">
        © 2025 Carely Bangladesh · <a href="${APP_URL}/terms" style="color:#2563EB;text-decoration:none;">Terms</a> · <a href="${APP_URL}/privacy" style="color:#2563EB;text-decoration:none;">Privacy</a><br>
        Carely is a marketplace. We do not verify professionals. Always meet safely.
      </td>
    </tr>
  </table>
</body></html>
`;

// Provider 1: Brevo. Uses the v6 @getbrevo/brevo SDK (BrevoClient +
// transactionalEmails.sendTransacEmail) - the older SibApiV3Sdk-style
// classes (TransactionalEmailsApi, SendSmtpEmail) this file used to call
// don't exist in this SDK version and threw "is not a constructor" on
// every single send, silently falling through to Resend every time.
const sendViaBrevo = async ({ to, subject, html, text }) => {
  console.log('Trying Brevo...');
  if (!process.env.BREVO_API_KEY) throw new Error('Brevo not configured');
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const result = await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: process.env.BREVO_FROM_EMAIL || 'carely.help@gmail.com', name: 'Carely' },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
    replyTo: { email: REPLY_TO },
  });
  return { provider: 'brevo', id: result.messageId };
};

// Provider 2: Resend
const sendViaResend = async ({ to, subject, html, text }) => {
  console.log('Trying Resend...');
  if (!process.env.RESEND_API_KEY) throw new Error('Resend not configured');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
    reply_to: REPLY_TO,
  });
  if (result.error) throw new Error('Resend: ' + JSON.stringify(result.error));
  return { provider: 'resend', id: result.data?.id };
};

// Provider 3: SendGrid
const sendViaSendGrid = async ({ to, subject, html, text }) => {
  console.log('Trying SendGrid...');
  if (!process.env.SENDGRID_API_KEY) throw new Error('SendGrid not configured');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const result = await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@carely.com',
    replyTo: REPLY_TO,
    subject,
    html,
    text,
  });
  return { provider: 'sendgrid', id: result[0]?.headers?.['x-message-id'] };
};

const providers = [sendViaBrevo, sendViaResend, sendViaSendGrid];

// Returns {success, provider?, id?, error?/errors?} so diagnostic callers
// (the admin test-email route) can report real status. Existing
// fire-and-forget callers (fireEmail) ignore the return value.
//
// `status` is optional - when passed (e.g. 'Confirmed', 'Declined'), a
// colored pill is rendered at the top of the email body.
const sendEmail = async ({ to, subject, title, content, status }) => {
  if (!to) return { success: false, error: 'No recipient address provided' };

  const html = emailTemplate(title, content, status);
  const text = htmlToText(`${title}\n\n${content}`);
  const errors = [];

  for (const provider of providers) {
    try {
      const result = await Promise.race([
        provider({ to, subject, html, text }),
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

module.exports = { sendEmail, fireEmail, detailRow, emailButton, statusPill };
