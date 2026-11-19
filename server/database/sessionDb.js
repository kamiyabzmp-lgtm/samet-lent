const Database = require("better-sqlite3");
const path = require("path");

// مسیر مستقل دیتابیس نشست‌های مدیر
const databasePath =
  process.env.SESSION_DATABASE_PATH ||
  path.join(__dirname, "sessions.sqlite");

// ایجاد یا باز کردن دیتابیس
const sessionDb = new Database(databasePath);

// تنظیمات امنیتی و عملکرد SQLite
sessionDb.pragma("journal_mode = WAL");
sessionDb.pragma("busy_timeout = 5000");

// ایجاد جدول نشست‌ها در صورت نبودن
sessionDb.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  )
`);

console.log("Admin session database connected.");

module.exports = sessionDb;