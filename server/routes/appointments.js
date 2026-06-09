const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
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
    WHERE a.company_id = ?
  `;
  const params = [req.user.company_id];
  if (from) { query += ` AND a.start_time >= ?`; params.push(from); }
  if (to) { query += ` AND a.start_time <= ?`; params.push(to); }
  if (master_id) { query += ` AND a.master_id = ?`; params.push(master_id); }
  query += ` ORDER BY a.start_time ASC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/', verifyToken, (req, res) => {
  const { client_id, vehicle_id, master_id, title, description, start_time, end_time, status = 'scheduled' } = req.body;
  const result = db.prepare(
    'INSERT INTO appointments (client_id, vehicle_id, master_id, title, description, start_time, end_time, status, company_id) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(client_id, vehicle_id, master_id, title, description, start_time, end_time, status, req.user.company_id);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, (req, res) => {
  const { client_id, vehicle_id, master_id, title, description, start_time, end_time, status } = req.body;
  db.prepare('UPDATE appointments SET client_id=?,vehicle_id=?,master_id=?,title=?,description=?,start_time=?,end_time=?,status=? WHERE id=? AND company_id=?')
    .run(client_id, vehicle_id, master_id, title, description, start_time, end_time, status, req.params.id, req.user.company_id);
  res.json({ ok: true });
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
  res.json({ ok: true });
});

module.exports = router;
