const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ clients: [], orders: [], vehicles: [] });
  const like = `%${q}%`;
  const cid = req.user.company_id;

  const clients = db.prepare(
    `SELECT id, name, phone, email FROM clients WHERE company_id = ? AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) LIMIT 5`
  ).all(cid, like, like, like);

  const vehicles = db.prepare(
    `SELECT v.id, v.brand, v.model, v.plate, v.vin, c.name as client_name, c.id as client_id
     FROM vehicles v LEFT JOIN clients c ON c.id = v.client_id
     WHERE v.company_id = ? AND (v.plate LIKE ? OR v.vin LIKE ? OR v.brand LIKE ? OR v.model LIKE ?) LIMIT 5`
  ).all(cid, like, like, like, like);

  const isNum = !isNaN(q) && q !== '';
  let orders;
  if (isNum) {
    orders = db.prepare(
      `SELECT o.id, o.status, o.complaint, o.created_at, c.name as client_name, v.brand, v.model, v.plate
       FROM orders o LEFT JOIN clients c ON c.id = o.client_id LEFT JOIN vehicles v ON v.id = o.vehicle_id
       WHERE o.company_id = ? AND (o.id = ? OR c.name LIKE ? OR v.plate LIKE ?) ORDER BY o.created_at DESC LIMIT 5`
    ).all(cid, parseInt(q), like, like);
  } else {
    orders = db.prepare(
      `SELECT o.id, o.status, o.complaint, o.created_at, c.name as client_name, v.brand, v.model, v.plate
       FROM orders o LEFT JOIN clients c ON c.id = o.client_id LEFT JOIN vehicles v ON v.id = o.vehicle_id
       WHERE o.company_id = ? AND (c.name LIKE ? OR v.plate LIKE ? OR o.complaint LIKE ?) ORDER BY o.created_at DESC LIMIT 5`
    ).all(cid, like, like, like);
  }

  res.json({ clients, orders, vehicles });
});

module.exports = router;
