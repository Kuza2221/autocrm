const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { from, to, master_id } = req.query;
  let query = `
    SELECT a.*,
      c.name as client_name, c.phone as client_phone,
      v.brand, v.model, v.plate,
      u.name as master_name
    FROM appointments a
    LEFT JOIN clients c ON c.id = a.client_id
    LEFT JOIN vehicles v ON v.id = a.vehicle_id
    LEFT JOIN users u ON u.id = a.master_id
    WHERE 1=1
  `;
  const params = [];
  if (from) { query += ` AND a.start_time >= ?`; params.push(from); }
  if (to) { query += ` AND a.start_time <= ?`; params.push(to); }
  if (master_id) { query += ` AND a.master_id = ?`; params.push(master_id); }
  query += ` ORDER BY a.start_time ASC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { client_id, vehicle_id, master_id, title, description, start_time, end_time, status = 'scheduled' } = req.body;
  const result = db.prepare(
    'INSERT INTO appointments (client_id, vehicle_id, master_id, title, description, start_time, end_time, status) VALUES (?,?,?,?,?,?,?,?)'
  ).run(client_id, vehicle_id, master_id, title, description, start_time, end_time, status);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { client_id, vehicle_id, master_id, title, description, start_time, end_time, status } = req.body;
  db.prepare('UPDATE appointments SET client_id=?,vehicle_id=?,master_id=?,title=?,description=?,start_time=?,end_time=?,status=? WHERE id=?')
    .run(client_id, vehicle_id, master_id, title, description, start_time, end_time, status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
