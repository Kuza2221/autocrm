const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/summary', verifyToken, (req, res) => {
  const cid = req.user.company_id;
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients WHERE company_id = ?').get(cid).c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders WHERE company_id = ?').get(cid).c;
  const activeOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status IN ('new','in_progress','waiting_parts') AND company_id = ?`).get(cid).c;
  const todayOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at) = ? AND company_id = ?`).get(today, cid).c;

  const monthRevenue = db.prepare(`
    SELECT COALESCE(SUM(total_parts + total_labor - discount), 0) as total
    FROM orders WHERE status = 'done' AND date(updated_at) >= ? AND company_id = ?
  `).get(monthStart, cid).total;

  const monthPaid = db.prepare(`
    SELECT COALESCE(SUM(paid), 0) as total FROM orders WHERE date(updated_at) >= ? AND company_id = ?
  `).get(monthStart, cid).total;

  const lowStock = db.prepare('SELECT COUNT(*) as c FROM parts WHERE qty <= min_qty AND min_qty > 0 AND company_id = ?').get(cid).c;

  res.json({ totalClients, totalOrders, activeOrders, todayOrders, monthRevenue, monthPaid, lowStock });
});

router.get('/revenue', verifyToken, (req, res) => {
  const cid = req.user.company_id;
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
    FROM orders WHERE status = 'done' AND ${dateFilter} AND company_id = ?
    GROUP BY ${groupBy} ORDER BY period ASC
  `).all(cid);
  res.json(rows);
});

router.get('/services', verifyToken, (req, res) => {
  const cid = req.user.company_id;
  const rows = db.prepare(`
    SELECT oi.name, SUM(oi.quantity) as count, SUM(oi.total) as revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.type = 'service' AND o.status = 'done' AND o.company_id = ?
    GROUP BY oi.name ORDER BY count DESC LIMIT 10
  `).all(cid);
  res.json(rows);
});

router.get('/masters', verifyToken, (req, res) => {
  const cid = req.user.company_id;
  const rows = db.prepare(`
    SELECT u.id, u.name,
      COUNT(o.id) as total_orders,
      SUM(CASE WHEN o.status='done' THEN 1 ELSE 0 END) as done_orders,
      COALESCE(SUM(CASE WHEN o.status='done' THEN o.total_labor ELSE 0 END), 0) as revenue
    FROM users u
    LEFT JOIN orders o ON o.master_id = u.id AND o.company_id = ?
    WHERE u.role IN ('mechanic', 'admin') AND u.company_id = ?
    GROUP BY u.id ORDER BY done_orders DESC
  `).all(cid, cid);
  res.json(rows);
});

module.exports = router;
