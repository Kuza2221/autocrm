const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const DAYS = [0,1,2,3,4,5,6]; // Mon=0 ... Sun=6

// GET my schedule
router.get('/my', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM mechanic_schedules WHERE user_id=?').all(req.user.id);
  res.json(rows);
});

// GET schedule of specific mechanic (for owner/manager)
router.get('/user/:id', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM mechanic_schedules WHERE user_id=? AND company_id=?').all(req.params.id, req.user.company_id);
  res.json(rows);
});

// GET all mechanics schedules for company
router.get('/company', verifyToken, (req, res) => {
  const rows = db.prepare(`
    SELECT ms.*, u.name as mechanic_name, u.specialization
    FROM mechanic_schedules ms
    JOIN users u ON u.id = ms.user_id
    WHERE ms.company_id=?
    ORDER BY u.name, ms.day_of_week
  `).all(req.user.company_id);
  res.json(rows);
});

// PUT save full week schedule (upsert per day)
router.put('/my', verifyToken, (req, res) => {
  const { schedule } = req.body; // array of { day_of_week, start_time, end_time, is_available }
  if (!Array.isArray(schedule)) return res.status(400).json({ error: 'schedule array required' });

  for (const day of schedule) {
    db.prepare(`
      INSERT INTO mechanic_schedules (user_id, company_id, day_of_week, start_time, end_time, is_available)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(user_id, day_of_week) DO UPDATE SET
        start_time=excluded.start_time,
        end_time=excluded.end_time,
        is_available=excluded.is_available
    `).run(req.user.id, req.user.company_id, day.day_of_week, day.start_time || '09:00', day.end_time || '18:00', day.is_available ? 1 : 0);
  }
  res.json({ ok: true });
});

// GET available slots for booking (public — no auth, by invite code)
router.get('/available/:inviteCode', (req, res) => {
  const company = db.prepare('SELECT id FROM companies WHERE invite_code=?').get(req.params.inviteCode.toUpperCase());
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const mechanics = db.prepare(`
    SELECT u.id, u.name, u.specialization,
      json_group_array(json_object(
        'day', ms.day_of_week,
        'start', ms.start_time,
        'end', ms.end_time,
        'available', ms.is_available
      )) as schedule
    FROM users u
    LEFT JOIN mechanic_schedules ms ON ms.user_id = u.id
    WHERE u.company_id=? AND u.role IN ('mechanic','manager')
    GROUP BY u.id
  `).all(company.id);

  res.json(mechanics.map(m => ({
    ...m,
    schedule: (() => { try { return JSON.parse(m.schedule); } catch { return []; } })()
  })));
});

module.exports = router;
