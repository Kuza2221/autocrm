const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { status, master_id, search } = req.query;
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
  if (status) { query += ` AND o.status = ?`; params.push(status); }
  if (master_id) { query += ` AND o.master_id = ?`; params.push(master_id); }
  if (search) { query += ` AND (c.name LIKE ? OR v.plate LIKE ? OR o.complaint LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ` ORDER BY o.created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
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

router.post('/', (req, res) => {
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

router.put('/:id', (req, res) => {
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

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
