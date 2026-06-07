const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { search, low_stock } = req.query;
  let query = 'SELECT * FROM parts WHERE 1=1';
  const params = [];
  if (search) { query += ` AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (low_stock === 'true') { query += ` AND qty <= min_qty`; }
  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO parts (name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes } = req.body;
  db.prepare('UPDATE parts SET name=?,sku=?,category=?,qty=?,min_qty=?,buy_price=?,sell_price=?,supplier=?,notes=? WHERE id=?')
    .run(name, sku, category, qty, min_qty, buy_price, sell_price, supplier, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM parts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
