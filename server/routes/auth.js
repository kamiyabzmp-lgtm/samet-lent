
const express = require("express");
const argon2 = require("argon2");
const { randomUUID } = require("crypto");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const db = require("../database/db");

const router = express.Router();

const loginSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, "Invalid mobile number"),
  password: z.string().min(1).max(128),
});

const customerRegistrationSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, "Invalid mobile number"),
  password: z.string().min(12).max(128),
});

const customerLoginSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, "Invalid mobile number"),
  password: z.string().min(1).max(128),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
  },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "تعداد درخواست‌های ثبت‌نام بیش از حد مجاز است.",
  },
});

function requireSameOrigin(req, res, next) {
  const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
  const origin = req.get("origin");

  if (origin !== allowedOrigin) {
    return res.status(403).json({
      success: false,
      message: "درخواست از مبدأ غیرمجاز پذیرفته نشد.",
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== "admin") {
    return res.status(401).json({
      success: false,
      message: "برای دسترسی به این بخش باید وارد حساب مدیر شوید.",
    });
  }

  const activeAdmin = db.prepare(`
    SELECT 1
    FROM users
    WHERE id = ? AND role = 'admin' AND is_active = 1
  `).get(req.session.user.id);

  if (!activeAdmin) {
    return res.status(401).json({
      success: false,
      message: "نشست مدیر معتبر نیست؛ دوباره وارد شوید.",
    });
  }

  next();
}

function requireCustomer(req, res, next) {
  if (!req.session?.user || req.session.user.role !== "customer") {
    return res.status(401).json({
      success: false,
      message: "برای دسترسی به این بخش وارد حساب مشتری شوید.",
    });
  }

  const activeCustomer = db.prepare(`
    SELECT 1
    FROM users
    WHERE id = ? AND role = 'customer' AND is_active = 1
  `).get(req.session.user.id);

  if (!activeCustomer) {
    return res.status(401).json({
      success: false,
      message: "نشست مشتری معتبر نیست؛ دوباره وارد شوید.",
    });
  }

  next();
}

function regenerateSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      req.session.user = {
        id: user.id,
        mobile: user.mobile,
        role: user.role,
      };

      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }

        resolve();
      });
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function clearSessionCookie(res) {
  res.clearCookie("koroush.sid", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

router.post("/login", requireSameOrigin, loginLimiter, async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "شماره موبایل یا رمز عبور معتبر نیست.",
      });
    }

    const { mobile, password } = validation.data;

    const user = db.prepare(`
      SELECT id, mobile, password_hash, role, is_active
      FROM users
      WHERE mobile = ?
    `).get(mobile);

    if (!user || user.is_active !== 1 || user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است.",
      });
    }

    const passwordIsValid = await argon2.verify(
      user.password_hash,
      password
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است.",
      });
    }

    try {
      await regenerateSession(req, user);
    } catch (error) {
      console.error("Admin session error:", error.message);
      return res.status(500).json({
        success: false,
        message: "ایجاد نشست ورود انجام نشد.",
      });
    }

    db.prepare(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id);

    return res.json({
      success: true,
      message: "ورود مدیر با موفقیت انجام شد.",
      user: {
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "خطای داخلی هنگام ورود رخ داد.",
    });
  }
});

router.post(
  "/register",
  requireSameOrigin,
  registrationLimiter,
  async (req, res) => {
    const validation = customerRegistrationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "شماره موبایل یا رمز عبور معتبر نیست.",
      });
    }

    const { mobile, password } = validation.data;

    try {
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      const id = randomUUID();

      db.prepare(`
        INSERT INTO users (id, mobile, password_hash, role)
        VALUES (?, ?, ?, 'customer')
      `).run(id, mobile, passwordHash);

      await regenerateSession(req, { id, mobile, role: "customer" });

      return res.status(201).json({
        success: true,
        user: { id, mobile, role: "customer" },
      });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({
          success: false,
          message: "برای این شماره موبایل قبلاً حسابی ثبت شده است.",
        });
      }

      console.error("Customer registration error:", error.message);
      return res.status(500).json({
        success: false,
        message: "ثبت‌نام انجام نشد.",
      });
    }
  }
);

router.post(
  "/customer/login",
  requireSameOrigin,
  loginLimiter,
  async (req, res) => {
    const validation = customerLoginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "شماره موبایل یا رمز عبور معتبر نیست.",
      });
    }

    try {
      const { mobile, password } = validation.data;
      const user = db.prepare(`
        SELECT id, mobile, password_hash, role, is_active
        FROM users
        WHERE mobile = ? AND role = 'customer'
      `).get(mobile);

      if (
        !user ||
        user.is_active !== 1 ||
        !(await argon2.verify(user.password_hash, password))
      ) {
        return res.status(401).json({
          success: false,
          message: "شماره موبایل یا رمز عبور اشتباه است.",
        });
      }

      await regenerateSession(req, user);
      db.prepare(`
        UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(user.id);

      return res.json({
        success: true,
        user: { id: user.id, mobile: user.mobile, role: user.role },
      });
    } catch (error) {
      console.error("Customer login error:", error.message);
      return res.status(500).json({
        success: false,
        message: "ورود انجام نشد.",
      });
    }
  }
);

router.get("/customer/me", requireCustomer, (req, res) => {
  return res.json({ success: true, user: req.session.user });
});

router.post(
  "/customer/logout",
  requireSameOrigin,
  requireCustomer,
  async (req, res) => {
    try {
      await destroySession(req);
      clearSessionCookie(res);
      return res.json({ success: true });
    } catch (error) {
      console.error("Customer logout error:", error.message);
      return res.status(500).json({
        success: false,
        message: "خروج از حساب انجام نشد.",
      });
    }
  }
);

router.get("/me", requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: req.session.user,
  });
});

router.post("/logout", requireSameOrigin, requireAdmin, (req, res) => {
  destroySession(req)
    .then(() => {
      clearSessionCookie(res);
      return res.json({
        success: true,
        message: "با موفقیت از حساب خارج شدید.",
      });
    })
    .catch((error) => {
      console.error("Admin logout error:", error.message);
      return res.status(500).json({
        success: false,
        message: "خروج از حساب انجام نشد.",
      });
    });
});

module.exports = {
  router,
  requireAdmin,
  requireCustomer,
  requireSameOrigin,
};
