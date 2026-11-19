
const Database = require("better-sqlite3");
const path = require("path");

// مسیر فایل دیتابیس فروشگاه
const databasePath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, "koroush-shop.sqlite");

// ایجاد یا باز کردن دیتابیس
const db = new Database(databasePath);

// تنظیمات SQLite
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

console.log("Kourosh Kabir database connected.");

module.exports = db;
