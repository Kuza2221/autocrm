const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  const { client_id } = req.query;
  let query = `SELECT v.*, c.name as client_name, c.phone as client_phone FROM vehicles v LEFT JOIN clients c ON c.id = v.client_id WHERE v.company_id = ?`;
  const params = [req.user.company_id];
  if (client_id) { query += ` AND v.client_id = ?`; params.push(client_id); }
  query += ` ORDER BY v.created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/', verifyToken, (req, res) => {
  const { client_id, brand, model, year, vin, plate, color, mileage, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO vehicles (client_id, brand, model, year, vin, plate, color, mileage, notes, company_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(client_id, brand, model, year, vin, plate, color, mileage, notes, req.user.company_id);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, (req, res) => {
  const { brand, model, year, vin, plate, color, mileage, notes } = req.body;
  db.prepare('UPDATE vehicles SET brand=?,model=?,year=?,vin=?,plate=?,color=?,mileage=?,notes=? WHERE id=? AND company_id=?')
    .run(brand, model, year, vin, plate, color, mileage, notes, req.params.id, req.user.company_id);
  res.json({ ok: true });
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
  res.json({ ok: true });
});

module.exports = router;
