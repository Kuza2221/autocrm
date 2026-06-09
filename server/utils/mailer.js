const nodemailer = require('nodemailer');

const APP_URL = process.env.APP_URL || 'http://localhost:3001';

// SMTP from env vars (production)
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Ethereal auto-account cache (dev/demo — real SMTP, viewable in browser)
let _etherealTransport = null;

async function getTransport() {
  if (SMTP_CONFIGURED) {
    return {
      transport: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      }),
      ethereal: false,
    };
  }

  // Auto-create Ethereal test account (one-time, cached in memory)
  if (!_etherealTransport) {
    const testAccount = await nodemailer.createTestAccount();
    _etherealTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }
  return { transport: _etherealTransport, ethereal: true };
}

/**
 * Send verification email.
 * Returns { ok, previewUrl? }
 * previewUrl is set when using Ethereal — show it to the user so they can open the email.
 */
async function sendVerificationEmail(toEmail, toName, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  const { transport, ethereal } = await getTransport();

  const info = await transport.sendMail({
    from: '"AutoCRM 🔧" <noreply@autocrm.app>',
    to: toEmail,
    subject: 'Подтвердите email — AutoCRM',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#2563eb;margin-bottom:8px">AutoCRM 🔧</h2>
        <p style="color:#374151">Привет, <strong>${toName}</strong>!</p>
        <p style="color:#374151">Нажмите кнопку ниже чтобы подтвердить ваш email и войти в систему:</p>
        <div style="margin:24px 0">
          <a href="${link}"
             style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
            ✅ Подтвердить email
          </a>
        </div>
        <p style="color:#9ca3af;font-size:13px">Ссылка действительна 24 часа.<br>Если вы не регистрировались — просто проигнорируйте это письмо.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">AutoCRM — система управления автосервисом</p>
      </div>
    `,
  });

  const previewUrl = ethereal ? nodemailer.getTestMessageUrl(info) : null;
  if (previewUrl) {
    console.log(`\n📧 Email preview (Ethereal): ${previewUrl}\n`);
  }

  return { ok: true, previewUrl };
}

module.exports = { sendVerificationEmail, SMTP_CONFIGURED };
