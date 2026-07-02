const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
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

const sendEmail = async ({ to, subject, title, content }) => {
  if (!to || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    await transporter.sendMail({
      from: `Carely Bangladesh <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: emailTemplate(title, content)
    });
    console.log('Email sent to:', to);
  } catch (err) {
    console.error('Email failed:', err.message);
  }
};

module.exports = { sendEmail };
