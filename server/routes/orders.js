const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// ── MY WORK REPORT (for mechanics) — must be before /:id ──────────────────
router.get('/my/report', verifyToken, (req, res) => {
  const { from, to } = req.query;
  let query = `
    SELECT o.*, c.name as client_name, v.brand, v.model, v.plate,
      CASE WHEN o.started_at IS NOT NULL AND o.completed_at IS NOT NULL
        THEN ROUND((julianday(o.completed_at) - julianday(o.started_at)) * 24 * 60)
        ELSE NULL END as duration_minutes
    FROM orders o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN vehicles v ON v.id = o.vehicle_id
    WHERE o.master_id = ?
  `;
  const params = [req.user.id];
  if (from) { query += ' AND o.created_at >= ?'; params.push(from); }
  if (to) { query += ' AND o.created_at <= ?'; params.push(to); }
  query += ' ORDER BY o.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// ── LIST ────────────────────────────────────────────────────────────────────
router.get('/', verifyToken, (req, res) => {
  const { status, master_id, search } = req.query;
  // Mechanics only see their own orders
  const isMechanic = req.user.role === 'mechanic';
  let query = `
    SELECT o.*,
      c.name as client_name, c.phone as client_phone,
      v.brand, v.model, v.plate,
      u.name as master_name
    FROM orders o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN vehicles v ON v.id = o.vehicle_id
    LEFT JOIN users u ON u.id = o.master_id
    WHERE 1=1
  `;
  const params = [];
  if (isMechanic) { query += ` AND o.master_id = ?`; params.push(req.user.id); }
  else if (master_id) { query += ` AND o.master_id = ?`; params.push(master_id); }
  if (status) { query += ` AND o.status = ?`; params.push(status); }
  if (search) { query += ` AND (c.name LIKE ? OR v.plate LIKE ? OR o.complaint LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ` ORDER BY o.created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

// ── GET SINGLE ──────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, (req, res) => {
  const order = db.prepare(`
    SELECT o.*,
      c.name as client_name, c.phone as client_phone,
      v.brand, v.model, v.plate, v.vin,
      u.name as master_name
    FROM orders o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN vehicles v ON v.id = o.vehicle_id
    LEFT JOIN users u ON u.id = o.master_id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

// ── CREATE ──────────────────────────────────────────────────────────────────
router.post('/', verifyToken, (req, res) => {
  const { vehicle_id, client_id, master_id, status = 'new', priority = 'normal', complaint, diagnosis, work_done, total_parts = 0, total_labor = 0, discount = 0, paid = 0, due_date, items = [] } = req.body;
  const result = db.prepare(`
    INSERT INTO orders (vehicle_id, client_id, master_id, status, priority, complaint, diagnosis, work_done, total_parts, total_labor, discount, paid, due_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(vehicle_id, client_id, master_id, status, priority, complaint, diagnosis, work_done, total_parts, total_labor, discount, paid, due_date);
  const orderId = result.lastInsertRowid;
  const insertItem = db.prepare('INSERT INTO order_items (order_id, type, name, quantity, unit_price, total) VALUES (?,?,?,?,?,?)');
  for (const item of items) {
    insertItem.run(orderId, item.type || 'part', item.name, item.quantity, item.unit_price, item.total);
  }
  res.json({ id: orderId });
});

// ── UPDATE ──────────────────────────────────────────────────────────────────
router.put('/:id', verifyToken, (req, res) => {
  const { master_id, status, priority, complaint, diagnosis, work_done, total_parts, total_labor, discount, paid, due_date, items } = req.body;
  db.prepare(`
    UPDATE orders SET master_id=?, status=?, priority=?, complaint=?, diagnosis=?, work_done=?, total_parts=?, total_labor=?, discount=?, paid=?, due_date=?, updated_at=datetime('now')
    WHERE id=?
  `).run(master_id, status, priority, complaint, diagnosis, work_done, total_parts, total_labor, discount, paid, due_date, req.params.id);
  if (items) {
    db.prepare('DELETE FROM order_items WHERE order_id=?').run(req.params.id);
    const insertItem = db.prepare('INSERT INTO order_items (order_id, type, name, quantity, unit_price, total) VALUES (?,?,?,?,?,?)');
    for (const item of items) {
      insertItem.run(req.params.id, item.type || 'part', item.name, item.quantity, item.unit_price, item.total);
    }
  }
  res.json({ ok: true });
});

// ── PATCH STATUS ────────────────────────────────────────────────────────────
router.patch('/:id/status', verifyToken, (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
  res.json({ ok: true });
});

// ── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── START WORK ──────────────────────────────────────────────────────────────
router.post('/:id/start', verifyToken, (req, res) => {
  const { photo_data, note } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  // Mechanics can only start their own orders
  if (req.user.role === 'mechanic' && order.master_id && order.master_id != req.user.id) {
    return res.status(403).json({ error: 'Not your order' });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE orders SET status='in_progress', started_at=?, master_id=COALESCE(master_id, ?), updated_at=? WHERE id=?`).run(now, req.user.id, now, req.params.id);

  // Log the action
  db.prepare('INSERT INTO work_logs (order_id, user_id, user_name, action, note, photo_data) VALUES (?,?,?,?,?,?)').run(req.params.id, req.user.id, req.user.name, 'start', note || 'Работа начата', photo_data || null);

  res.json({ ok: true, started_at: now });
});

// ── COMPLETE WORK ───────────────────────────────────────────────────────────
router.post('/:id/complete', verifyToken, (req, res) => {
  const { photo_data, note, worker_notes } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  if (req.user.role === 'mechanic' && order.master_id && order.master_id != req.user.id) {
    return res.status(403).json({ error: 'Not your order' });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE orders SET status='done', completed_at=?, worker_notes=COALESCE(?,worker_notes), updated_at=? WHERE id=?`).run(now, worker_notes || null, now, req.params.id);

  db.prepare('INSERT INTO work_logs (order_id, user_id, user_name, action, note, photo_data) VALUES (?,?,?,?,?,?)').run(req.params.id, req.user.id, req.user.name, 'complete', note || 'Работа завершена', photo_data || null);

  res.json({ ok: true, completed_at: now });
});

// ── FORCE MAJEURE ───────────────────────────────────────────────────────────
router.post('/:id/force-majeure', verifyToken, (req, res) => {
  const { photo_data, note } = req.body;
  if (!note) return res.status(400).json({ error: 'Description required' });
  if (!photo_data) return res.status(400).json({ error: 'Photo required for force majeure' });

  db.prepare('INSERT INTO work_logs (order_id, user_id, user_name, action, note, photo_data) VALUES (?,?,?,?,?,?)').run(req.params.id, req.user.id, req.user.name, 'force_majeure', note, photo_data);

  res.json({ ok: true });
});

// ── WORK LOGS ───────────────────────────────────────────────────────────────
router.get('/:id/logs', verifyToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM work_logs WHERE order_id=? ORDER BY created_at ASC').all(req.params.id));
});

module.exports = router;
