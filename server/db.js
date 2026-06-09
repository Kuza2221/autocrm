/**
 * db.js — Universal DB adapter
 * Uses PostgreSQL (via DATABASE_URL) in production, SQLite locally.
 *
 * Exposes a synchronous-style API compatible with better-sqlite3:
 *   db.prepare(sql).run(...params)
 *   db.prepare(sql).get(...params)
 *   db.prepare(sql).all(...params)
 *   db.exec(sql)
 */

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL) {
  // ─── PostgreSQL mode ────────────────────────────────────────────────────────
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Convert SQLite ? placeholders → PostgreSQL $1 $2 ...
  function toPostgres(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  // Synchronous-compatible wrapper using synchronous-like interface via deasync
  // Actually we expose a Promise-based internal + sync wrapper via a trick:
  // We run queries synchronously using the pg-sync approach via a shared state trick.
  // Since Node.js routes are async, we use a different pattern:
  // db.prepare(sql) returns an object whose .run/.get/.all methods are ASYNC
  // but we wrap all route handlers to support both.

  // Because the entire codebase uses synchronous SQLite calls, we use
  // a sync-over-async bridge via `deasync` or we rewrite routes.
  // Simplest: use the `pg-sync` library pattern with execSync trick.
  // Actually the cleanest: make prepare() return sync-looking methods
  // that internally call a child_process execSync trick... too complex.
  //
  // Better approach: use `@databases/pg-sync` or `better-sqlite3` style.
  // CLEANEST: keep SQLite for file storage but persist via Railway Volume.
  //
  // Since Railway Volume approach failed interactively, let's use
  // proper async pg but rewrite routes to be async-compatible.

  // We'll use a synchronous execution bridge via worker threads trick.
  // Actually: let's use `sync-rpc` pattern — run pg queries via child process.

  // FINAL DECISION: Use pg with async/await and make all route callbacks async.
  // The existing routes need minor updates. Let's do a thin async wrapper
  // that queues results and provides .runSync/.getSync/.allSync via Atomics.

  // Pragmatic solution: deasync npm package
  let deasync;
  try {
    deasync = require('deasync');
  } catch (e) {
    // deasync not installed, install it
    require('child_process').execSync('npm install deasync', { cwd: __dirname, stdio: 'ignore' });
    deasync = require('deasync');
  }

  function syncQuery(sql, params = []) {
    let result = undefined;
    let error = undefined;
    let done = false;

    pool.query(sql, params).then(r => {
      result = r;
      done = true;
    }).catch(e => {
      error = e;
      done = true;
    });

    deasync.loopWhile(() => !done);

    if (error) throw error;
    return result;
  }

  // Initialize schema
  function initSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'mechanic',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        vin TEXT,
        plate TEXT,
        color TEXT,
        mileage INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        master_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'new',
        priority TEXT DEFAULT 'normal',
        complaint TEXT,
        diagnosis TEXT,
        work_done TEXT,
        ai_notes TEXT,
        total_parts REAL DEFAULT 0,
        total_labor REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        paid REAL DEFAULT 0,
        due_date TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'part',
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total REAL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS parts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        category TEXT,
        qty INTEGER DEFAULT 0,
        min_qty INTEGER DEFAULT 0,
        buy_price REAL DEFAULT 0,
        sell_price REAL DEFAULT 0,
        supplier TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        master_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        google_event_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        date TEXT DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        device_hint TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS google_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        expiry_date TEXT,
        calendar_id TEXT DEFAULT 'primary',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        note TEXT,
        due_date TEXT,
        repeat_months INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS order_photos (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        data TEXT,
        caption TEXT,
        type TEXT DEFAULT 'other',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS order_templates (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        complaint TEXT,
        items TEXT DEFAULT '[]',
        total_labor REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS work_logs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name TEXT,
        action TEXT NOT NULL,
        note TEXT,
        photo_data TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        owner_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS mechanic_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL DEFAULT '09:00',
        end_time TEXT NOT NULL DEFAULT '18:00',
        is_available INTEGER DEFAULT 1,
        UNIQUE(user_id, day_of_week)
      );
    `;

    // Run schema creation
    let done = false;
    pool.query(schema).then(() => {
      // Seed admin if no users
      return pool.query('SELECT COUNT(*) as c FROM users');
    }).then(r => {
      if (parseInt(r.rows[0].c) === 0) {
        return pool.query(
          "INSERT INTO users (name, email, password, role, email_verified) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO UPDATE SET email_verified=1",
          ['Admin', 'admin@autocrm.com', 'admin123', 'admin', 1]
        );
      }
    }).then(() => {
      // Run column additions (idempotent)
      pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0`).catch(()=>{});
      pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT`).catch(()=>{});
      pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS started_at TEXT`).catch(()=>{});
      pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TEXT`).catch(()=>{});
      pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS worker_notes TEXT`).catch(()=>{});
      pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT DEFAULT ''`).catch(()=>{});
      // Multi-tenancy: add company_id to all data tables
      const dataTables = ['users','clients','vehicles','orders','parts','appointments','expenses','reminders','order_photos','order_templates','work_logs'];
      for (const t of dataTables) {
        pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS company_id INTEGER`).catch(()=>{});
      }
      pool.query(`INSERT INTO companies (id, name, invite_code) VALUES (1, 'Default Company', 'DEMO01') ON CONFLICT DO NOTHING`).catch(()=>{});
    })
      .catch(e => { console.error('Schema init error:', e.message); done = true; });

    deasync.loopWhile(() => !done);
    console.log('PostgreSQL schema initialized');
  }

  initSchema();

  // Thin prepare() wrapper
  const db = {
    prepare(sql) {
      const pgSql = toPostgres(sql);
      return {
        run(...params) {
          // Flatten array-of-arrays (better-sqlite3 style)
          const p = params.flat();
          const r = syncQuery(pgSql, p);
          // Return lastInsertRowid compatible object
          const row = r.rows && r.rows[0];
          return { lastInsertRowid: row ? row.id : undefined, changes: r.rowCount };
        },
        get(...params) {
          const p = params.flat();
          const r = syncQuery(pgSql, p);
          return r.rows[0] || null;
        },
        all(...params) {
          const p = params.flat();
          const r = syncQuery(pgSql, p);
          return r.rows;
        },
      };
    },
    exec(sql) {
      syncQuery(toPostgres(sql));
    },
  };

  module.exports = db;

} else {
  // ─── SQLite mode (local development) ───────────────────────────────────────
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
      ai_notes TEXT,
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
      google_event_id TEXT,
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
    CREATE TABLE IF NOT EXISTS _migrations (key TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      note TEXT,
      due_date TEXT,
      repeat_months INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      data TEXT,
      caption TEXT,
      type TEXT DEFAULT 'other',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      complaint TEXT,
      items TEXT DEFAULT '[]',
      total_labor REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      action TEXT NOT NULL,
      note TEXT,
      photo_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      owner_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
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
  if (!migrated('add_client_birthday')) {
    try { db.exec('ALTER TABLE clients ADD COLUMN birthday TEXT'); } catch {}
  }
  if (!migrated('add_email_verified')) {
    try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch {}
    try { db.exec('ALTER TABLE users ADD COLUMN verify_token TEXT'); } catch {}
  }
  if (!migrated('add_order_timer')) {
    try { db.exec('ALTER TABLE orders ADD COLUMN started_at TEXT'); } catch {}
    try { db.exec('ALTER TABLE orders ADD COLUMN completed_at TEXT'); } catch {}
    try { db.exec('ALTER TABLE orders ADD COLUMN worker_notes TEXT'); } catch {}
  }
  if (!migrated('add_specialization')) {
    try { db.exec('ALTER TABLE users ADD COLUMN specialization TEXT DEFAULT ""'); } catch {}
  }
  if (!migrated('mechanic_schedules')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS mechanic_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL DEFAULT '09:00',
        end_time TEXT NOT NULL DEFAULT '18:00',
        is_available INTEGER DEFAULT 1,
        UNIQUE(user_id, day_of_week)
      )
    `);
  }
  if (!migrated('add_company_id')) {
    const tables = ['users','clients','vehicles','orders','parts','appointments','expenses','reminders','order_photos','order_templates','work_logs'];
    for (const t of tables) {
      try { db.exec(`ALTER TABLE ${t} ADD COLUMN company_id INTEGER`); } catch {}
    }
    try {
      db.exec(`INSERT OR IGNORE INTO companies (id, name, invite_code) VALUES (1, 'Default Company', 'DEMO01')`);
      for (const t of tables) {
        try { db.exec(`UPDATE ${t} SET company_id = 1 WHERE company_id IS NULL`); } catch {}
      }
    } catch(e) { console.error('Migration error:', e.message); }
  }

  // Seed default admin
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    db.prepare('INSERT INTO users (name, email, password, role, email_verified) VALUES (?,?,?,?,?)').run('Admin', 'admin@autocrm.com', 'admin123', 'admin', 1);
  }

  module.exports = db;
}
