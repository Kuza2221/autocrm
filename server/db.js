const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'autocrm.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'mechanic',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    vin TEXT,
    plate TEXT,
    color TEXT,
    mileage INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    master_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new',
    priority TEXT DEFAULT 'normal',
    complaint TEXT,
    diagnosis TEXT,
    work_done TEXT,
    total_parts REAL DEFAULT 0,
    total_labor REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    paid REAL DEFAULT 0,
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'part',
    name TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    total REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    qty INTEGER DEFAULT 0,
    min_qty INTEGER DEFAULT 0,
    buy_price REAL DEFAULT 0,
    sell_price REAL DEFAULT 0,
    supplier TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    master_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    device_hint TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS google_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date TEXT,
    calendar_id TEXT DEFAULT 'primary',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Add google_event_id to appointments if not exists
  CREATE TABLE IF NOT EXISTS _migrations (key TEXT PRIMARY KEY);
`);

// Migrations
const migrated = (key) => {
  const exists = db.prepare('SELECT key FROM _migrations WHERE key=?').get(key);
  if (exists) return true;
  db.prepare('INSERT INTO _migrations (key) VALUES (?)').run(key);
  return false;
};
if (!migrated('add_google_event_id')) {
  try { db.exec('ALTER TABLE appointments ADD COLUMN google_event_id TEXT'); } catch {}
}
if (!migrated('add_ai_notes')) {
  try { db.exec('ALTER TABLE orders ADD COLUMN ai_notes TEXT'); } catch {}
}

// Seed default admin if no users
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`)
    .run('Admin', 'admin@autocrm.com', 'admin123', 'admin');
}

module.exports = db;
