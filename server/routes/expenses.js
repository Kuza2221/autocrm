const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  const { from, to } = req.query;
  let query = 'SELECT * FROM expenses WHERE company_id = ?';
  const params = [req.user.company_id];
  if (from) { query += ` AND date >= ?`; params.push(from); }
  if (to) { query += ` AND date <= ?`; params.push(to); }
  query += ' ORDER BY date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', verifyToken, (req, res) => {
  const { category, description, amount, date } = req.body;
  const result = db.prepare('INSERT INTO expenses (category, description, amount, date, company_id) VALUES (?,?,?,?,?)').run(category, description, amount, date, req.user.company_id);
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
  res.json({ ok: true });
});

module.exports = router;
