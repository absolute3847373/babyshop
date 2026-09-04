const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const raw = new DatabaseSync(path.join(__dirname, 'babyshop.db'));
raw.exec('PRAGMA journal_mode = WAL;');

// Обёртка, повторяющая привычный API better-sqlite3 (prepare().get/.all/.run),
// чтобы остальной код сервера не пришлось переписывать.
// ВАЖНО: в отличие от better-sqlite3, встроенный node:sqlite не умеет биндить
// значение undefined (кидает TypeError) — поэтому здесь оно всегда заменяется на null.
function sanitizeParams(params) {
  return params.map(p => (p === undefined ? null : p));
}

const db = {
  exec(sql) {
    raw.exec(sql);
  },
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      get(...params) {
        return stmt.get(...sanitizeParams(params));
      },
      all(...params) {
        return stmt.all(...sanitizeParams(params));
      },
      run(...params) {
        const info = stmt.run(...sanitizeParams(params));
        return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
      },
    };
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  telegram_id TEXT,
  role TEXT DEFAULT 'customer',
  recipient_name TEXT,
  avatar_url TEXT,
  pharmacy_name TEXT,
  contact_person TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  language TEXT DEFAULT 'ru',
  theme TEXT DEFAULT 'light',
  terms_accepted_at TEXT,
  terms_version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ru TEXT NOT NULL,
  name_uz TEXT,
  name_en TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  weight TEXT,
  price TEXT DEFAULT 'error404',
  photo_url TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  items_json TEXT NOT NULL,
  total_text TEXT,
  address TEXT,
  pharmacy_name TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'new',
  reviewed_by INTEGER,
  reviewed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  event TEXT NOT NULL,
  details TEXT,
  actor_id INTEGER,
  actor_role TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
`);

module.exports = db;
