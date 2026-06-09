const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  const { search, low_stock } = req.query;
  let query = 'SELECT * FROM parts WHERE company_id = ?';
  const params = [req.user.company_id];
  if (search) { query += ` AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (low_stock === 'true') { query += ` AND qty <= min_qty`; }
  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', verifyToken, (req, res) => {
  const { name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO parts (name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes, company_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes, req.user.company_id);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, (req, res) => {
  const { name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes } = req.body;
  db.prepare('UPDATE parts SET name=?,sku=?,category=?,qty=?,min_qty=?,buy_price=?,sell_price=?,supplier=?,notes=? WHERE id=? AND company_id=?')
    .run(name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes, req.params.id, req.user.company_id);
  res.json({ ok: true });
});

router.delete('/:id', verifyToken, (req, res) => {
  db.prepare('DELETE FROM parts WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
  res.json({ ok: true });
});

module.exports = router;
