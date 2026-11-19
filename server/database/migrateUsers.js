
const db = require("./db");

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      mobile TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('admin', 'staff', 'customer')),
      is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_mobile
    ON users(mobile);

    CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

    CREATE INDEX IF NOT EXISTS idx_users_active
    ON users(is_active);
  `);

  console.log("Users table and indexes are ready.");
} catch (error) {
  console.error("Users migration failed:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
