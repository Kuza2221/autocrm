const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { signAccess, signRefresh, JWT_SECRET, verifyToken } = require('../middleware/auth');
const { sendVerificationEmail, SMTP_CONFIGURED } = require('../utils/mailer');

const isProd = process.env.NODE_ENV === 'production';

function cookieOpts(rememberMe) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
    path: '/'
  };
}

// ── List users (protected) ──────────────────────────────────────────────────
router.get('/', verifyToken, (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users WHERE company_id=? ORDER BY name').all(req.user.company_id));
});

// ── Create user (protected, admin) ─────────────────────────────────────────
router.post('/', verifyToken, (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const result = db.prepare('INSERT INTO users (name, email, password, role, company_id) VALUES (?,?,?,?,?)').run(name, email, password, role, req.user.company_id);
    res.json({ id: result.lastInsertRowid });
  } catch {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// ── Update user ─────────────────────────────────────────────────────────────
router.put('/:id', verifyToken, (req, res) => {
  const { name, email, role } = req.body;
  db.prepare('UPDATE users SET name=?, email=?, role=? WHERE id=? AND company_id=?').run(name, email, role, req.params.id, req.user.company_id);
  res.json({ ok: true });
});

// ── Delete user ─────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM users WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
  res.json({ ok: true });
});

// ── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, password, rememberMe = true, mode = 'create', companyName, inviteCode, email: rawEmail } = req.body;

  if (!name || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });

  const isJoin = mode === 'join';

  // Owner must provide email; worker email is optional (auto-generated if missing)
  let email = rawEmail ? rawEmail.trim().toLowerCase() : null;
  if (!isJoin && !email) return res.status(400).json({ error: 'Email required' });

  let companyId = null;
  let userRole = 'mechanic';
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  if (isJoin) {
    if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });
    const company = db.prepare('SELECT id, invite_code FROM companies WHERE invite_code=?').get(inviteCode.toUpperCase().trim());
    if (!company) return res.status(400).json({ error: 'Invalid invite code' });
    companyId = company.id;
    userRole = 'mechanic';

    // Check name uniqueness within company
    const nameExists = db.prepare('SELECT id FROM users WHERE LOWER(name)=LOWER(?) AND company_id=?').get(name.trim(), companyId);
    if (nameExists) return res.status(400).json({ error: 'Name already taken in this company' });

    // Auto-generate internal email if not provided
    if (!email) {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      email = `${slug}_${company.invite_code.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}@internal.autocrm`;
    }
  } else {
    // Create new company — owner
    if (!companyName && totalUsers > 0) return res.status(400).json({ error: 'Company name required' });
    const cName = companyName || 'My Company';

    let code;
    let attempts = 0;
    do {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      attempts++;
    } while (db.prepare('SELECT id FROM companies WHERE invite_code=?').get(code) && attempts < 10);

    const compResult = db.prepare('INSERT INTO companies (name, invite_code) VALUES (?,?)').run(cName, code);
    companyId = compResult.lastInsertRowid;
    userRole = 'admin';
  }

  const vToken = crypto.randomBytes(32).toString('hex');

  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role, company_id, email_verified, verify_token) VALUES (?,?,?,?,?,?,?)'
    ).run(name.trim(), email, password, userRole, companyId, isJoin ? 1 : 0, vToken);

    if (!isJoin) {
      db.prepare('UPDATE companies SET owner_id=? WHERE id=?').run(result.lastInsertRowid, companyId);
    }

    const user = { id: result.lastInsertRowid, name: name.trim(), email, role: userRole, company_id: companyId };

    if (isJoin) {
      // Worker — immediate access, no email verification
      const accessToken = signAccess(user);
      const refreshToken = signRefresh(user.id, rememberMe);
      db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?,?,?)').run(
        refreshToken, user.id,
        new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString()
      );
      res.cookie('rt', refreshToken, cookieOpts(rememberMe));
      return res.json({ accessToken, user });
    }

    // Owner — send email verification
    let previewUrl = null;
    try {
      const mail = await Promise.race([
        sendVerificationEmail(email, name, vToken),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 8000))
      ]);
      previewUrl = mail.previewUrl || null;
    } catch(e) { console.error('Email send failed:', e.message); }

    res.json({ pending: true, email, previewUrl });
  } catch(e) {
    if (e.message?.includes('UNIQUE') || e.message?.includes('unique')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── VERIFY EMAIL ────────────────────────────────────────────────────────────
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const user = db.prepare('SELECT * FROM users WHERE verify_token=?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

  db.prepare('UPDATE users SET email_verified=1, verify_token=NULL WHERE id=?').run(user.id);

  const userObj = { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id };
  const accessToken = signAccess(userObj);
  const refreshToken = signRefresh(user.id, true);
  db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?,?,?)').run(
    refreshToken, user.id,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );

  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  res.redirect(`${appUrl}/?verified=1&token=${accessToken}&rt_set=1`);
});

// ── RESEND VERIFICATION ─────────────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.email_verified) return res.json({ ok: true, already: true });

  const token = user.verify_token || require('crypto').randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verify_token=? WHERE id=?').run(token, user.id);

  let previewUrl = null;
  try {
    const mail = await sendVerificationEmail(email, user.name, token);
    previewUrl = mail.previewUrl || null;
  } catch(e) { console.error(e); }
  res.json({ ok: true, previewUrl });
});

// ── LOGIN by email (owner/admin) ────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password, rememberMe = false } = req.body;
  const user = db.prepare('SELECT id, name, email, role, company_id, email_verified FROM users WHERE email=? AND password=?').get(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.email_verified) return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', email });

  const userObj = { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id };
  const accessToken = signAccess(userObj);
  const refreshToken = signRefresh(user.id, rememberMe);

  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();
  const deviceHint = req.headers['user-agent']?.slice(0, 120) || 'unknown';

  db.prepare('INSERT OR REPLACE INTO refresh_tokens (user_id, token, expires_at, device_hint) VALUES (?,?,?,?)')
    .run(user.id, refreshToken, expiresAt, deviceHint);

  res.cookie('rt', refreshToken, cookieOpts(rememberMe));
  res.json({ accessToken, user: userObj });
});

// ── LOGIN by name + company code (worker) ───────────────────────────────────
router.post('/login-worker', (req, res) => {
  const { name, inviteCode, password, rememberMe = false } = req.body;
  if (!name || !inviteCode || !password) return res.status(400).json({ error: 'All fields required' });

  const company = db.prepare('SELECT id FROM companies WHERE invite_code=?').get(inviteCode.toUpperCase().trim());
  if (!company) return res.status(401).json({ error: 'Company not found' });

  const user = db.prepare(
    'SELECT id, name, email, role, company_id, email_verified FROM users WHERE LOWER(name)=LOWER(?) AND company_id=? AND password=?'
  ).get(name.trim(), company.id, password);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const userObj = { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id };
  const accessToken = signAccess(userObj);
  const refreshToken = signRefresh(user.id, rememberMe);

  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();
  const deviceHint = req.headers['user-agent']?.slice(0, 120) || 'unknown';

  db.prepare('INSERT OR REPLACE INTO refresh_tokens (user_id, token, expires_at, device_hint) VALUES (?,?,?,?)')
    .run(user.id, refreshToken, expiresAt, deviceHint);

  res.cookie('rt', refreshToken, cookieOpts(rememberMe));
  res.json({ accessToken, user: userObj });
});

// ── REFRESH ─────────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies?.rt;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Refresh token expired' }); }

  const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token=?').get(token);
  if (!stored) return res.status(401).json({ error: 'Token revoked' });

  if (new Date(stored.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE token=?').run(token);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const user = db.prepare('SELECT id, name, email, role, company_id FROM users WHERE id=?').get(payload.id);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const accessToken = signAccess(user);

  const newRefresh = signRefresh(user.id, true);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE refresh_tokens SET token=?, expires_at=? WHERE token=?').run(newRefresh, expiresAt, token);

  res.cookie('rt', newRefresh, cookieOpts(true));
  res.json({ accessToken, user });
});

// ── LOGOUT ──────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const token = req.cookies?.rt;
  if (token) db.prepare('DELETE FROM refresh_tokens WHERE token=?').run(token);
  res.clearCookie('rt', { path: '/' });
  res.json({ ok: true });
});

// ── ME (current user) ────────────────────────────────────────────────────────
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, company_id FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

module.exports = router;
