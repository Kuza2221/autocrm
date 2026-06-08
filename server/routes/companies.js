const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET current company info
router.get('/me', verifyToken, (req, res) => {
  const company = db.prepare('SELECT id, name, invite_code, created_at FROM companies WHERE id=?').get(req.user.company_id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  const members = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE company_id=? ORDER BY name').all(req.user.company_id);
  res.json({ ...company, members });
});

// Regenerate invite code (admin only)
router.post('/regenerate-code', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
  } while (db.prepare('SELECT id FROM companies WHERE invite_code=?').get(code) && attempts < 10);
  db.prepare('UPDATE companies SET invite_code=? WHERE id=?').run(code, req.user.company_id);
  res.json({ invite_code: code });
});

// Validate invite code (public — used during registration)
router.get('/validate-code/:code', (req, res) => {
  const company = db.prepare('SELECT id, name FROM companies WHERE invite_code=?').get(req.params.code.toUpperCase());
  if (!company) return res.status(404).json({ error: 'Invalid invite code' });
  res.json({ id: company.id, name: company.name });
});

// Update company name (admin only)
router.put('/me', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE companies SET name=? WHERE id=?').run(name, req.user.company_id);
  res.json({ ok: true });
});

module.exports = router;
