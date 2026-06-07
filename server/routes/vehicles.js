const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { client_id } = req.query;
  let query = `SELECT v.*, c.name as client_name, c.phone as client_phone FROM vehicles v LEFT JOIN clients c ON c.id = v.client_id`;
  const params = [];
  if (client_id) { query += ` WHERE v.client_id = ?`; params.push(client_id); }
  query += ` ORDER BY v.created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { client_id, brand, model, year, vin, plate, color, mileage, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO vehicles (client_id, brand, model, year, vin, plate, color, mileage, notes) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(client_id, brand, model, year, vin, plate, color, mileage, notes);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { brand, model, year, vin, plate, color, mileage, notes } = req.body;
  db.prepare('UPDATE vehicles SET brand=?,model=?,year=?,vin=?,plate=?,color=?,mileage=?,notes=? WHERE id=?')
    .run(brand, model, year, vin, plate, color, mileage, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
