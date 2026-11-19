
const express = require("express");
const { randomUUID } = require("crypto");
const { z } = require("zod");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const db = require("../database/db");
const { requireAdmin, requireSameOrigin } = require("./auth");
const { calculateSalePrice } = require("../lib/pricing");

const router = express.Router();

// --------------------------------------------------
// تنظیمات آپلود تصاویر
// --------------------------------------------------

const uploadDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedImageTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = allowedImageTypes[file.mimetype];
    cb(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 30,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes[file.mimetype]) {
      return cb(new Error("فرمت تصویر مجاز نیست."));
    }

    cb(null, true);
  },
});

// بررسی محتوای واقعی تصاویر
async function verifyImageFiles(files) {
  const { fileTypeFromFile } = await import("file-type");

  for (const file of files) {
    const detected = await fileTypeFromFile(file.path);

    if (
      !detected ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        detected.mime
      ) ||
      detected.mime !== file.mimetype ||
      path.extname(file.filename).toLowerCase() !==
        `.${detected.ext}`
    ) {
      return false;
    }
  }

  return true;
}

// پاک‌کردن فایل‌های آپلودشده در صورت خطا
async function removeUploadedFiles(files) {
  await Promise.all(
    files.map((file) =>
      fs.promises.unlink(file.path).catch(() => {})
    )
  );
}

// محدودسازی تعداد درخواست‌های آپلود
const imageUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "تعداد درخواست‌های آپلود بیش از حد مجاز است.",
  },
});

// آپلود تصاویر محصولات توسط مدیر
router.post(
  "/admin/images",
  requireAdmin,
  requireSameOrigin,
  imageUploadLimiter,
  (req, res, next) => {
    upload.array("images", 30)(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "حجم هر تصویر نباید بیشتر از ۵ مگابایت باشد."
              : error.code === "LIMIT_FILE_COUNT"
                ? "حداکثر ۳۰ تصویر مجاز است."
                : "فایل انتخاب‌شده معتبر نیست.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    const files = req.files || [];

    try {
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "حداقل یک تصویر انتخاب کنید.",
        });
      }

      const validImages = await verifyImageFiles(files);

      if (!validImages) {
        await removeUploadedFiles(files);

        return res.status(400).json({
          success: false,
          message: "محتوای واقعی یکی از تصاویر معتبر نیست.",
        });
      }

      return res.status(201).json({
        success: true,
        count: files.length,
        images: files.map(
          (file) => `/uploads/${file.filename}`
        ),
      });
    } catch (error) {
      await removeUploadedFiles(files);

      console.error("Image upload error:", error.message);

      return res.status(500).json({
        success: false,
        message: "خطا هنگام پردازش تصاویر.",
      });
    }
  }
);

// --------------------------------------------------
// اعتبارسنجی و ساختار محصولات
// --------------------------------------------------

const productIdSchema = z.string().min(1).max(100);

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(220),
  sku: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(150).nullable().optional(),
  category: z.string().trim().min(1).max(150),
  basePrice: z.number().int().safe().nonnegative().nullable(),
  stock: z.number().int().safe().nonnegative().default(0),
  description: z.string().max(5000).default(""),
  compatibleVehicles: z
    .array(z.string().trim().min(1).max(100))
    .max(100)
    .default([]),
  images: z
    .array(z.string().trim().min(1).max(1000))
    .max(30)
    .default([]),
  tags: z
    .array(z.string().trim().min(1).max(100))
    .max(50)
    .default([]),
});

function safeJsonParse(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatProduct(product, includeLegacyPrice = false) {
  const hasBasePrice = product.base_price !== null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    basePrice: product.base_price,
    price: hasBasePrice
      ? calculateSalePrice(product.base_price)
      : null,
    ...(includeLegacyPrice
      ? {
          legacyPrice: hasBasePrice ? null : product.price,
        }
      : {}),
    stock: product.stock,
    description: product.description,
    compatibleVehicles: safeJsonParse(
      product.compatible_vehicles
    ),
    images: safeJsonParse(product.images),
    tags: safeJsonParse(product.tags),
    isActive: product.is_active === 1,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

function handleDatabaseError(error, res, operation) {
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({
      success: false,
      message: "کد کالا یا شناسه یکتای محصول تکراری است.",
    });
  }

  console.error(`${operation} error:`, error.message);

  return res.status(500).json({
    success: false,
    message: "خطای داخلی هنگام انجام عملیات محصول رخ داد.",
  });
}

// --------------------------------------------------
// مدیریت محصولات - فقط مدیر
// --------------------------------------------------

// دریافت همه محصولات، شامل محصولات غیرفعال
router.get("/admin", requireAdmin, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT *
      FROM products
      ORDER BY created_at DESC
    `).all();

    return res.json({
      success: true,
      count: products.length,
      data: products.map((product) => formatProduct(product, true)),
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Admin get products"
    );
  }
});

// افزودن محصول جدید
router.post("/admin", requireAdmin, requireSameOrigin, (req, res) => {
  const validation = productSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "اطلاعات محصول معتبر نیست.",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const data = validation.data;
    const id = randomUUID();
    const price = calculateSalePrice(data.basePrice);

    db.prepare(`
      INSERT INTO products (
        id, name, slug, sku, brand, category,
        base_price, price, stock, description,
        compatible_vehicles, images, tags, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      data.name,
      data.slug,
      data.sku,
      data.brand ?? null,
      data.category,
      data.basePrice,
      price,
      data.stock,
      data.description,
      JSON.stringify(data.compatibleVehicles),
      JSON.stringify(data.images),
      JSON.stringify(data.tags)
    );

    const product = db.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).get(id);

    return res.status(201).json({
      success: true,
      message: "محصول با موفقیت ثبت شد.",
      data: formatProduct(product),
    });
  } catch (error) {
    return handleDatabaseError(error, res, "Create product");
  }
});

// ویرایش اطلاعات محصول
router.put("/admin/:id", requireAdmin, requireSameOrigin, (req, res) => {
  const idValidation = productIdSchema.safeParse(req.params.id);
  const bodyValidation = productSchema.safeParse(req.body);

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: "شناسه یا اطلاعات محصول معتبر نیست.",
    });
  }

  try {
    const id = idValidation.data;
    const data = bodyValidation.data;
    const price = calculateSalePrice(data.basePrice);

    const result = db.prepare(`
      UPDATE products
      SET
        name = ?,
        slug = ?,
        sku = ?,
        brand = ?,
        category = ?,
        base_price = ?,
        price = CASE WHEN ? IS NULL THEN price ELSE ? END,
        stock = ?,
        description = ?,
        compatible_vehicles = ?,
        images = ?,
        tags = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.name,
      data.slug,
      data.sku,
      data.brand ?? null,
      data.category,
      data.basePrice,
      data.basePrice,
      price,
      data.stock,
      data.description,
      JSON.stringify(data.compatibleVehicles),
      JSON.stringify(data.images),
      JSON.stringify(data.tags),
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "محصول موردنظر پیدا نشد.",
      });
    }

    const product = db.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).get(id);

    return res.json({
      success: true,
      message: "اطلاعات محصول با موفقیت ویرایش شد.",
      data: formatProduct(product),
    });
  } catch (error) {
    return handleDatabaseError(error, res, "Update product");
  }
});

// فعال یا غیرفعال کردن محصول
router.patch(
  "/admin/:id/status",
  requireAdmin,
  requireSameOrigin,
  (req, res) => {
    const idValidation = productIdSchema.safeParse(
      req.params.id
    );

    const statusSchema = z.object({
      isActive: z.boolean(),
    });

    const bodyValidation = statusSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "شناسه یا وضعیت محصول معتبر نیست.",
      });
    }

    try {
      const result = db.prepare(`
        UPDATE products
        SET
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        bodyValidation.data.isActive ? 1 : 0,
        idValidation.data
      );

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "محصول موردنظر پیدا نشد.",
        });
      }

      return res.json({
        success: true,
        message: bodyValidation.data.isActive
          ? "محصول فعال شد."
          : "محصول غیرفعال شد.",
      });
    } catch (error) {
      return handleDatabaseError(
        error,
        res,
        "Change product status"
      );
    }
  }
);

// --------------------------------------------------
// مسیرهای عمومی فروشگاه
// --------------------------------------------------

// دریافت محصولات فعال
router.get("/", (req, res) => {
  try {
    const products = db.prepare(`
      SELECT *
      FROM products
      WHERE is_active = 1
      ORDER BY created_at DESC
    `).all();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products.map((product) => formatProduct(product)),
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Get public products"
    );
  }
});

// دریافت جزئیات یک محصول فعال
router.get("/:id", (req, res) => {
  const validation = productIdSchema.safeParse(req.params.id);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "شناسه محصول معتبر نیست.",
    });
  }

  try {
    const product = db.prepare(`
      SELECT *
      FROM products
      WHERE id = ? AND is_active = 1
    `).get(validation.data);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "محصول موردنظر پیدا نشد.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProduct(product),
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Get product"
    );
  }
});

module.exports = router;
