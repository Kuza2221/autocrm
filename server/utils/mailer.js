const nodemailer = require('nodemailer');

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

let transporter = null;
if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendVerificationEmail(toEmail, toName, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  if (!SMTP_CONFIGURED) {
    // Development fallback — log to console
    console.log(`\n📧 VERIFICATION EMAIL (no SMTP configured)`);
    console.log(`   To: ${toEmail}`);
    console.log(`   Link: ${link}\n`);
    return { ok: true, dev: true };
  }

  await transporter.sendMail({
    from: `"AutoCRM" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Подтвердите email — AutoCRM',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#2563eb">AutoCRM 🔧</h2>
        <p>Привет, ${toName}!</p>
        <p>Подтвердите ваш email чтобы завершить регистрацию:</p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Подтвердить email
        </a>
        <p style="color:#6b7280;font-size:13px">Ссылка действует 24 часа. Если вы не регистрировались — проигнорируйте письмо.</p>
      </div>
    `,
  });
  return { ok: true };
}

module.exports = { sendVerificationEmail, SMTP_CONFIGURED };
