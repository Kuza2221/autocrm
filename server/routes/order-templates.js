const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM order_templates ORDER BY name').all();
  res.json(rows.map(t => ({ ...t, items: JSON.parse(t.items || '[]') })));
});

router.post('/', verifyToken, (req, res) => {
  const { name, complaint, items, total_labor } = req.body;
  try {
    const result = db.prepare('INSERT INTO order_templates (name, complaint, items, total_labor) VALUES (?,?,?,?)').run(name, complaint || '', JSON.stringify(items || []), total_labor || 0);
    res.json({ id: result.lastInsertRowid });
  } catch { res.status(400).json({ error: 'Name exists' }); }
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM order_templates WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
