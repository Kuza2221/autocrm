const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const REDIRECT_URI = `${APP_URL}/api/google-calendar/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
].join(' ');

// ── Check if Google Calendar is configured ─────────────────────────────────
router.get('/status', verifyToken, (req, res) => {
  if (!CLIENT_ID) return res.json({ configured: false, connected: false });
  const gt = db.prepare('SELECT id, calendar_id FROM google_tokens WHERE user_id=?').get(req.user.id);
  res.json({ configured: true, connected: !!gt, calendarId: gt?.calendar_id || 'primary' });
});

// ── Generate OAuth URL ──────────────────────────────────────────────────────
router.get('/auth-url', verifyToken, (req, res) => {
  if (!CLIENT_ID) return res.status(400).json({ error: 'Google Calendar not configured' });

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: req.user.id.toString()
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// ── OAuth callback ──────────────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;
  if (error) return res.redirect(`/settings?google=error&msg=${error}`);
  if (!code || !userId) return res.redirect('/settings?google=error');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error(tokens.error_description || 'No access token');

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    db.prepare(`
      INSERT INTO google_tokens (user_id, access_token, refresh_token, expiry_date)
      VALUES (?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token=excluded.access_token,
        refresh_token=COALESCE(excluded.refresh_token, refresh_token),
        expiry_date=excluded.expiry_date,
        updated_at=datetime('now')
    `).run(userId, tokens.access_token, tokens.refresh_token, expiry);

    res.redirect('/settings?google=connected');
  } catch (e) {
    console.error('Google OAuth error:', e.message);
    res.redirect(`/settings?google=error`);
  }
});

// ── Disconnect ──────────────────────────────────────────────────────────────
router.delete('/disconnect', verifyToken, (req, res) => {
  db.prepare('DELETE FROM google_tokens WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

// ── Helper: get valid Google access token ──────────────────────────────────
async function getValidToken(userId) {
  const gt = db.prepare('SELECT * FROM google_tokens WHERE user_id=?').get(userId);
  if (!gt) return null;

  // Refresh if expired (with 60s buffer)
  if (!gt.expiry_date || new Date(gt.expiry_date) < new Date(Date.now() + 60000)) {
    if (!gt.refresh_token) return null;
    try {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          refresh_token: gt.refresh_token, grant_type: 'refresh_token'
        })
      });
      const t = await r.json();
      if (!t.access_token) return null;
      const expiry = new Date(Date.now() + t.expires_in * 1000).toISOString();
      db.prepare('UPDATE google_tokens SET access_token=?, expiry_date=?, updated_at=datetime("now") WHERE user_id=?')
        .run(t.access_token, expiry, userId);
      return t.access_token;
    } catch { return null; }
  }
  return gt.access_token;
}

// ── Sync appointment to Google Calendar ────────────────────────────────────
router.post('/sync/:appointmentId', verifyToken, async (req, res) => {
  const apt = db.prepare(`
    SELECT a.*, c.name as client_name, c.phone as client_phone,
           v.brand, v.model, v.plate
    FROM appointments a
    LEFT JOIN clients c ON c.id = a.client_id
    LEFT JOIN vehicles v ON v.id = a.vehicle_id
    WHERE a.id = ?
  `).get(req.params.appointmentId);

  if (!apt) return res.status(404).json({ error: 'Appointment not found' });

  const token = await getValidToken(req.user.id);
  if (!token) return res.status(400).json({ error: 'Google Calendar not connected' });

  const gt = db.prepare('SELECT calendar_id FROM google_tokens WHERE user_id=?').get(req.user.id);
  const calId = encodeURIComponent(gt?.calendar_id || 'primary');

  const body = {
    summary: apt.title,
    description: [
      apt.description,
      apt.client_name ? `Клиент: ${apt.client_name} ${apt.client_phone || ''}` : '',
      apt.brand ? `Авто: ${apt.brand} ${apt.model} ${apt.plate || ''}` : ''
    ].filter(Boolean).join('\n'),
    start: { dateTime: new Date(apt.start_time).toISOString(), timeZone: 'Europe/Moscow' },
    end: { dateTime: new Date(apt.end_time).toISOString(), timeZone: 'Europe/Moscow' },
    colorId: apt.status === 'cancelled' ? '11' : apt.status === 'completed' ? '10' : '1'
  };

  try {
    let response;
    if (apt.google_event_id) {
      // Update existing event
      response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${apt.google_event_id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      // Create new event
      response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
    const event = await response.json();
    if (event.id) {
      db.prepare('UPDATE appointments SET google_event_id=? WHERE id=?').run(event.id, apt.id);
    }
    res.json({ ok: true, eventId: event.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Sync ALL appointments ───────────────────────────────────────────────────
router.post('/sync-all', verifyToken, async (req, res) => {
  const appointments = db.prepare(`
    SELECT a.*, c.name as client_name, c.phone as client_phone, v.brand, v.model, v.plate
    FROM appointments a
    LEFT JOIN clients c ON c.id = a.client_id
    LEFT JOIN vehicles v ON v.id = a.vehicle_id
    WHERE a.status != 'cancelled'
  `).all();

  let synced = 0, errors = 0;
  for (const apt of appointments) {
    try {
      await fetch(`http://localhost:${process.env.PORT || 3001}/api/google-calendar/sync/${apt.id}`, {
        method: 'POST',
        headers: { Authorization: req.headers.authorization }
      });
      synced++;
    } catch { errors++; }
  }
  res.json({ synced, errors, total: appointments.length });
});

module.exports = router;
