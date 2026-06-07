const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/:orderId', verifyToken, (req, res) => {
  res.json(db.prepare('SELECT id, order_id, caption, type, created_at FROM order_photos WHERE order_id = ? ORDER BY created_at').all(req.params.orderId));
});

// Get photo data (separate to avoid loading all data at once)
router.get('/:orderId/photo/:id', verifyToken, (req, res) => {
  const photo = db.prepare('SELECT data FROM order_photos WHERE id=? AND order_id=?').get(req.params.id, req.params.orderId);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  res.json({ data: photo.data });
});

router.post('/:orderId', verifyToken, (req, res) => {
  const { data, caption, type } = req.body;
  const result = db.prepare('INSERT INTO order_photos (order_id, data, caption, type) VALUES (?,?,?,?)').run(req.params.orderId, data, caption || '', type || 'other');
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM order_photos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
