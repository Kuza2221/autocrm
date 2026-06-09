require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.APP_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true);
    else cb(null, true); // allow all in development; tighten in prod if needed
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/users', require('./routes/users'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/google-calendar', require('./routes/google-calendar'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/search', require('./routes/search'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/order-templates', require('./routes/order-templates'));
app.use('/api/order-photos', require('./routes/order-photos'));
app.use('/api/training', require('./routes/training'));
app.use('/api/schedules', require('./routes/schedules'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  time: new Date().toISOString(),
  env: isProd ? 'production' : 'development'
}));

// ── Serve static frontend in production ──────────────────────────────────
if (isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AutoCRM server running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  if (isProd) console.log(`App: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
});
