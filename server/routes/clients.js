const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT c.*,
      COUNT(DISTINCT v.id) as vehicle_count,
      COUNT(DISTINCT o.id) as order_count
    FROM clients c
    LEFT JOIN vehicles v ON v.client_id = c.id
    LEFT JOIN orders o ON o.client_id = c.id
  `;
  const params = [];
  if (search) {
    query += ` WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ` GROUP BY c.id ORDER BY c.created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.get('/birthdays', (req, res) => {
  const all = db.prepare('SELECT id, name, phone, birthday FROM clients WHERE birthday IS NOT NULL AND birthday != ""').all();
  const today = new Date();
  const upcoming = all.filter(c => {
    try {
      const bday = new Date(c.birthday);
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      const diff = (thisYear - today) / (1000 * 60 * 60 * 24);
      return diff >= -1 && diff <= 7;
    } catch { return false; }
  });
  res.json(upcoming);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE client_id = ?').all(req.params.id);
  const orders = db.prepare(`
    SELECT o.*, v.brand, v.model, v.plate, u.name as master_name
    FROM orders o
    LEFT JOIN vehicles v ON v.id = o.vehicle_id
    LEFT JOIN users u ON u.id = o.master_id
    WHERE o.client_id = ?
    ORDER BY o.created_at DESC
  `).all(req.params.id);
  res.json({ ...client, vehicles, orders });
});

router.post('/', (req, res) => {
  const { name, phone, email, notes, birthday } = req.body;
  const result = db.prepare('INSERT INTO clients (name, phone, email, notes, birthday) VALUES (?, ?, ?, ?, ?)').run(name, phone, email, notes, birthday || null);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, phone, email, notes, birthday } = req.body;
  db.prepare('UPDATE clients SET name=?, phone=?, email=?, notes=?, birthday=? WHERE id=?').run(name, phone, email, notes, birthday || null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
