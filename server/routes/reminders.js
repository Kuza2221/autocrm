const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  res.json(db.prepare(`
    SELECT r.*, c.name as client_name, c.phone as client_phone
    FROM reminders r LEFT JOIN clients c ON c.id = r.client_id
    WHERE r.completed = 0 ORDER BY r.due_date ASC
  `).all());
});

router.get('/client/:id', verifyToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM reminders WHERE client_id = ? ORDER BY due_date ASC').all(req.params.id));
});

router.post('/', verifyToken, (req, res) => {
  const { client_id, title, note, due_date, repeat_months } = req.body;
  const result = db.prepare('INSERT INTO reminders (client_id, title, note, due_date, repeat_months) VALUES (?,?,?,?,?)').run(client_id, title, note, due_date, repeat_months || 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id/complete', verifyToken, (req, res) => {
  const r = db.prepare('SELECT * FROM reminders WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE reminders SET completed=1 WHERE id=?').run(req.params.id);
  if (r.repeat_months > 0) {
    const next = new Date(r.due_date || new Date());
    next.setMonth(next.getMonth() + r.repeat_months);
    db.prepare('INSERT INTO reminders (client_id, title, note, due_date, repeat_months) VALUES (?,?,?,?,?)').run(r.client_id, r.title, r.note, next.toISOString().split('T')[0], r.repeat_months);
  }
  res.json({ ok: true });
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
