const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.post('/seed', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const c = db.prepare("INSERT INTO clients (name, phone, email, notes, birthday) VALUES (?,?,?,?,?)").run('Иван Петров (ТЕСТ)', '+7 900 123-45-67', 'test@example.com', 'Тестовый клиент', '1985-06-15');
    const v = db.prepare("INSERT INTO vehicles (client_id, brand, model, year, plate, vin) VALUES (?,?,?,?,?,?)").run(c.lastInsertRowid, 'Toyota', 'Camry', 2019, 'А777ВВ77', 'JT2BF22K1W0107478');
    db.prepare("INSERT INTO orders (client_id, vehicle_id, status, complaint, diagnosis, total_parts, total_labor) VALUES (?,?,?,?,?,?,?)").run(c.lastInsertRowid, v.lastInsertRowid, 'in_progress', 'Стук при торможении (ТЕСТ)', 'Износ тормозных колодок', 3500, 2000);
    db.prepare("INSERT INTO order_templates (name, complaint, items, total_labor) VALUES (?,?,?,?)").run('Замена масла', 'Плановая замена масла и фильтра', JSON.stringify([{type:'part',name:'Масло 5W30 4л',quantity:1,unit_price:2500,total:2500},{type:'labor',name:'Замена масла',quantity:1,unit_price:800,total:800}]), 800);
    db.prepare("INSERT INTO order_templates (name, complaint, items, total_labor) VALUES (?,?,?,?)").run('ТО-1 (15 000 км)', 'Плановое ТО-1', JSON.stringify([{type:'part',name:'Масло 5W30 4л',quantity:1,unit_price:2500,total:2500},{type:'part',name:'Масляный фильтр',quantity:1,unit_price:400,total:400},{type:'part',name:'Воздушный фильтр',quantity:1,unit_price:600,total:600}]), 1500);
    res.json({ ok: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

router.delete('/reset', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  db.prepare("DELETE FROM clients WHERE name LIKE '%(ТЕСТ)%'").run();
  db.prepare("DELETE FROM order_templates WHERE name IN ('Замена масла', 'ТО-1 (15 000 км)')").run();
  res.json({ ok: true });
});

module.exports = router;
