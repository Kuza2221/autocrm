const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { signAccess, signRefresh, JWT_SECRET, verifyToken } = require('../middleware/auth');

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
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY name').all());
});

// ── Create user (protected, admin) ─────────────────────────────────────────
router.post('/', verifyToken, (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)').run(name, email, password, role);
    res.json({ id: result.lastInsertRowid });
  } catch {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// ── Update user ─────────────────────────────────────────────────────────────
router.put('/:id', verifyToken, (req, res) => {
  const { name, email, role } = req.body;
  db.prepare('UPDATE users SET name=?, email=?, role=? WHERE id=?').run(name, email, role, req.params.id);
  res.json({ ok: true });
});

// ── Delete user ─────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password, rememberMe = true } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });

  // Check if any users exist — first user gets admin, rest get mechanic
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const role = count === 0 ? 'admin' : 'mechanic';

  try {
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)').run(name, email, password, role);
    const user = { id: result.lastInsertRowid, name, email, role };

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user.id, rememberMe);
    db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?,?,?)').run(
      refreshToken, user.id,
      new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString()
    );

    res.cookie('rt', refreshToken, cookieOpts(rememberMe));
    res.json({ accessToken, user });
  } catch {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// ── LOGIN ───────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password, rememberMe = false } = req.body;
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE email=? AND password=?').get(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user.id, rememberMe);

  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();
  const deviceHint = req.headers['user-agent']?.slice(0, 120) || 'unknown';

  db.prepare('INSERT OR REPLACE INTO refresh_tokens (user_id, token, expires_at, device_hint) VALUES (?,?,?,?)')
    .run(user.id, refreshToken, expiresAt, deviceHint);

  res.cookie('rt', refreshToken, cookieOpts(rememberMe));
  res.json({ accessToken, user });
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

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id=?').get(payload.id);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const accessToken = signAccess(user);

  // Rotate refresh token
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
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

module.exports = router;
