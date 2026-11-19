const session = require("express-session");
const SqliteStore = require("better-sqlite3-session-store")(session);
const sessionDb = require("../database/sessionDb");

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from environment variables.");
}

const sessionMiddleware = session({
  name: "koroush.sid",
  secret: process.env.SESSION_SECRET,
  store: new SqliteStore({
    client: sessionDb,
    expired: {
      clear: true,
      intervalMs: 15 * 60 * 1000,
    },
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  },
});

module.exports = sessionMiddleware;