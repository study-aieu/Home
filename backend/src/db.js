const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'app.db');
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbFile);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  wp_url TEXT NOT NULL,
  wp_username TEXT NOT NULL,
  wp_app_password_enc TEXT NOT NULL,
  wp_app_password_iv TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

module.exports = db;