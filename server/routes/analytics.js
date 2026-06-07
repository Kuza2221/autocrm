const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/summary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const activeOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status IN ('new','in_progress','waiting_parts')`).get().c;
  const todayOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at) = ?`).get(today).c;

  const monthRevenue = db.prepare(`
    SELECT COALESCE(SUM(total_parts + total_labor - discount), 0) as total
    FROM orders WHERE status = 'done' AND date(updated_at) >= ?
  `).get(monthStart).total;

  const monthPaid = db.prepare(`
    SELECT COALESCE(SUM(paid), 0) as total FROM orders WHERE date(updated_at) >= ?
  `).get(monthStart).total;

  const lowStock = db.prepare('SELECT COUNT(*) as c FROM parts WHERE qty <= min_qty AND min_qty > 0').get().c;

  res.json({ totalClients, totalOrders, activeOrders, todayOrders, monthRevenue, monthPaid, lowStock });
});

router.get('/revenue', (req, res) => {
  const { period = 'month' } = req.query;
  let groupBy, dateFilter;
  if (period === 'week') {
    groupBy = `strftime('%Y-%W', updated_at)`;
    dateFilter = `date(updated_at) >= date('now', '-8 weeks')`;
  } else if (period === 'year') {
    groupBy = `strftime('%Y-%m', updated_at)`;
    dateFilter = `date(updated_at) >= date('now', '-12 months')`;
  } else {
    groupBy = `date(updated_at)`;
    dateFilter = `date(updated_at) >= date('now', '-30 days')`;
  }
  const rows = db.prepare(`
    SELECT ${groupBy} as period,
      COALESCE(SUM(total_parts + total_labor - discount), 0) as revenue,
      COALESCE(SUM(paid), 0) as paid,
      COUNT(*) as orders
    FROM orders WHERE status = 'done' AND ${dateFilter}
    GROUP BY ${groupBy} ORDER BY period ASC
  `).all();
  res.json(rows);
});

router.get('/services', (req, res) => {
  const rows = db.prepare(`
    SELECT oi.name, SUM(oi.quantity) as count, SUM(oi.total) as revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.type = 'service' AND o.status = 'done'
    GROUP BY oi.name ORDER BY count DESC LIMIT 10
  `).all();
  res.json(rows);
});

router.get('/masters', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name,
      COUNT(o.id) as total_orders,
      SUM(CASE WHEN o.status='done' THEN 1 ELSE 0 END) as done_orders,
      COALESCE(SUM(CASE WHEN o.status='done' THEN o.total_labor ELSE 0 END), 0) as revenue
    FROM users u
    LEFT JOIN orders o ON o.master_id = u.id
    WHERE u.role IN ('mechanic', 'admin')
    GROUP BY u.id ORDER BY done_orders DESC
  `).all();
  res.json(rows);
});

module.exports = router;
