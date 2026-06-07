const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  if (from) { query += ` AND date >= ?`; params.push(from); }
  if (to) { query += ` AND date <= ?`; params.push(to); }
  query += ' ORDER BY date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { category, description, amount, date } = req.body;
  const result = db.prepare('INSERT INTO expenses (category, description, amount, date) VALUES (?,?,?,?)').run(category, description, amount, date);
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
