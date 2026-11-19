const express = require("express");
const { createHash, randomUUID } = require("crypto");
const { z } = require("zod");

const db = require("../database/db");
const { calculateSalePrice } = require("../lib/pricing");
const {
  requireAdmin,
  requireCustomer,
  requireSameOrigin,
} = require("./auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const orderStatuses = [
  "pending_payment",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const cartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().trim().min(1).max(100),
      quantity: z.number().int().min(1).max(99),
    }).strict()
  ).min(1).max(30),
  shippingAddress: z.object({
    recipientName: z.string().trim().min(2).max(120),
    recipientMobile: z.string().regex(/^09\d{9}$/),
    province: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    addressLine: z.string().trim().min(10).max(500),
    postalCode: z.string().regex(/^\d{10}$/),
  }).strict(),
}).strict();

const idempotencySchema = z.string().uuid();
const orderIdSchema = z.string().min(1).max(100);
const adminStatusSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
  note: z.string().trim().max(500).optional().default(""),
}).strict();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "تعداد درخواست‌های ثبت سفارش بیش از حد مجاز است.",
  },
});

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requestHash(items, shippingAddress) {
  return createHash("sha256")
    .update(JSON.stringify({ items, shippingAddress }))
    .digest("hex");
}

function readOrder(orderId) {
  const order = db.prepare(`
    SELECT
      id, user_id, status, payment_status, currency, subtotal,
      shipping_amount, total_amount, recipient_name, recipient_mobile,
      shipping_address, created_at, updated_at
    FROM orders
    WHERE id = ?
  `).get(orderId);

  if (!order) {
    return null;
  }

  const items = db.prepare(`
    SELECT product_id, product_name, sku, quantity, unit_price, line_total
    FROM order_items
    WHERE order_id = ?
    ORDER BY rowid
  `).all(orderId);

  const history = db.prepare(`
    SELECT previous_status, next_status, note, created_at
    FROM order_status_history
    WHERE order_id = ?
    ORDER BY created_at, rowid
  `).all(orderId);

  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.payment_status,
    currency: order.currency,
    subtotal: order.subtotal,
    shippingAmount: order.shipping_amount,
    totalAmount: order.total_amount,
    shippingAddress: JSON.parse(order.shipping_address),
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
    history: history.map((entry) => ({
      previousStatus: entry.previous_status,
      status: entry.next_status,
      note: entry.note,
      createdAt: entry.created_at,
    })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

function handleOrderError(error, res, operation) {
  if (error instanceof OrderError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  console.error(`${operation} error:`, error.message);
  return res.status(500).json({
    success: false,
    message: "خطای داخلی هنگام انجام عملیات سفارش رخ داد.",
  });
}

router.post(
  "/",
  requireCustomer,
  requireSameOrigin,
  orderLimiter,
  (req, res) => {
    const validation = cartSchema.safeParse(req.body);
    const keyValidation = idempotencySchema.safeParse(
      req.get("Idempotency-Key")
    );

    if (!validation.success || !keyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "سبد خرید، نشانی ارسال یا شناسه درخواست معتبر نیست.",
      });
    }

    const { items, shippingAddress } = validation.data;
    const productIds = items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "هر محصول باید فقط یک‌بار در سبد خرید درج شود.",
      });
    }

    const sortedItems = [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId)
    );
    const serializedAddress = JSON.stringify(shippingAddress);
    const bodyHash = requestHash(sortedItems, shippingAddress);
    const idempotencyKey = keyValidation.data;

    try {
      const createOrder = db.transaction(() => {
        const existing = db.prepare(`
          SELECT id, user_id, request_hash
          FROM orders
          WHERE idempotency_key = ?
        `).get(idempotencyKey);

        if (existing) {
          if (
            existing.user_id !== req.session.user.id ||
            existing.request_hash !== bodyHash
          ) {
            throw new OrderError(
              409,
              "شناسه درخواست قبلاً برای سفارش دیگری استفاده شده است."
            );
          }

          return { id: existing.id, created: false };
        }

        const orderItems = [];
        let total = 0n;

        for (const item of items) {
          const product = db.prepare(`
            SELECT id, name, sku, base_price, stock, is_active
            FROM products
            WHERE id = ?
          `).get(item.productId);

          if (!product || product.is_active !== 1) {
            throw new OrderError(409, "یکی از محصولات دیگر در دسترس نیست.");
          }

          if (product.base_price === null) {
            throw new OrderError(
              409,
              `قیمت «${product.name}» هنوز تأیید نشده است.`
            );
          }

          if (product.stock < item.quantity) {
            throw new OrderError(
              409,
              `موجودی «${product.name}» برای تعداد درخواستی کافی نیست.`
            );
          }

          const unitPrice = calculateSalePrice(product.base_price);
          const lineTotal = BigInt(unitPrice) * BigInt(item.quantity);
          total += lineTotal;

          if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new OrderError(400, "مبلغ سفارش از محدوده مجاز بیشتر است.");
          }

          orderItems.push({
            ...item,
            name: product.name,
            sku: product.sku,
            unitPrice,
            lineTotal: Number(lineTotal),
          });
        }

        const orderId = randomUUID();
        const user = req.session.user;
        const recipientName = shippingAddress.recipientName;
        const recipientMobile = shippingAddress.recipientMobile;

        db.prepare(`
          INSERT INTO orders (
            id, user_id, idempotency_key, request_hash, status,
            payment_status, currency, subtotal, shipping_amount,
            total_amount, recipient_name, recipient_mobile, shipping_address
          )
          VALUES (?, ?, ?, ?, 'pending_payment', 'pending', 'IRR', ?, 0, ?, ?, ?, ?)
        `).run(
          orderId,
          user.id,
          idempotencyKey,
          bodyHash,
          Number(total),
          Number(total),
          recipientName,
          recipientMobile,
          serializedAddress
        );

        const decrementStock = db.prepare(`
          UPDATE products
          SET stock = stock - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND is_active = 1 AND stock >= ?
        `);
        const insertItem = db.prepare(`
          INSERT INTO order_items (
            id, order_id, product_id, product_name, sku,
            quantity, unit_price, line_total
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of orderItems) {
          const stockResult = decrementStock.run(
            item.quantity,
            item.productId,
            item.quantity
          );

          if (stockResult.changes !== 1) {
            throw new OrderError(
              409,
              `موجودی «${item.name}» تغییر کرده است؛ سبد را دوباره بررسی کنید.`
            );
          }

          insertItem.run(
            randomUUID(),
            orderId,
            item.productId,
            item.name,
            item.sku,
            item.quantity,
            item.unitPrice,
            item.lineTotal
          );
        }

        db.prepare(`
          INSERT INTO order_status_history (
            id, order_id, actor_user_id, previous_status, next_status, note
          )
          VALUES (?, ?, ?, NULL, 'pending_payment', 'ثبت سفارش')
        `).run(randomUUID(), orderId, user.id);

        db.prepare(`
          INSERT INTO payments (id, order_id, provider, amount, currency, status)
          VALUES (?, ?, 'unconfigured', ?, 'IRR', 'pending')
        `).run(randomUUID(), orderId, Number(total));

        return { id: orderId, created: true };
      });

      const result = createOrder();
      const order = readOrder(result.id);

      return res.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created
          ? "سفارش ثبت شد و تا زمان تأیید پرداخت در انتظار می‌ماند."
          : "این سفارش قبلاً ثبت شده است.",
        data: order,
      });
    } catch (error) {
      return handleOrderError(error, res, "Create order");
    }
  }
);

router.get("/", requireCustomer, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, status, payment_status, currency, total_amount,
             created_at, updated_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.session.user.id);

    return res.json({
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        currency: order.currency,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      })),
    });
  } catch (error) {
    return handleOrderError(error, res, "List customer orders");
  }
});

router.get("/admin", requireAdmin, (req, res) => {
  const querySchema = z.object({
    status: z.enum(orderStatuses).optional(),
    q: z.string().trim().max(100).optional(),
  }).strict();
  const validation = querySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "فیلتر سفارش معتبر نیست.",
    });
  }

  try {
    const { status, q } = validation.data;
    const searchTerm = q ? `%${q}%` : null;
    const orders = db.prepare(`
      SELECT
        o.id, o.user_id, u.mobile AS account_mobile, o.status,
        o.payment_status, o.currency, o.total_amount,
        o.recipient_name, o.recipient_mobile, o.created_at, o.updated_at,
        (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE (? IS NULL OR o.status = ?)
        AND (
          ? IS NULL OR o.id LIKE ? OR o.recipient_name LIKE ?
          OR o.recipient_mobile LIKE ? OR u.mobile LIKE ?
          OR EXISTS (
            SELECT 1 FROM order_items i
            WHERE i.order_id = o.id AND i.sku LIKE ?
          )
        )
      ORDER BY o.created_at DESC
      LIMIT 100
    `).all(
      status || null,
      status || null,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    );

    return res.json({
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        customerId: order.user_id,
        customerMobile: order.account_mobile,
        recipientName: order.recipient_name,
        recipientMobile: order.recipient_mobile,
        status: order.status,
        paymentStatus: order.payment_status,
        currency: order.currency,
        totalAmount: order.total_amount,
        itemCount: order.item_count,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      })),
    });
  } catch (error) {
    return handleOrderError(error, res, "Admin list orders");
  }
});

router.get("/admin/:id", requireAdmin, (req, res) => {
  const validation = orderIdSchema.safeParse(req.params.id);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "شناسه سفارش معتبر نیست.",
    });
  }

  try {
    const order = readOrder(validation.data);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "سفارش پیدا نشد.",
      });
    }

    const account = db.prepare(`
      SELECT u.mobile
      FROM users u
      JOIN orders o ON o.user_id = u.id
      WHERE o.id = ?
    `).get(order.id);

    return res.json({
      success: true,
      data: {
        ...order,
        customerMobile: account?.mobile || null,
      },
    });
  } catch (error) {
    return handleOrderError(error, res, "Admin get order");
  }
});

router.patch(
  "/admin/:id/status",
  requireAdmin,
  requireSameOrigin,
  (req, res) => {
    const idValidation = orderIdSchema.safeParse(req.params.id);
    const bodyValidation = adminStatusSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "شناسه یا وضعیت سفارش معتبر نیست.",
      });
    }

    const { status: nextStatus, note } = bodyValidation.data;
    const transitions = {
      pending_payment: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    try {
      const updateStatus = db.transaction(() => {
        const order = db.prepare(`
          SELECT id, status, payment_status FROM orders WHERE id = ?
        `).get(idValidation.data);

        if (!order) {
          throw new OrderError(404, "سفارش پیدا نشد.");
        }

        if (!transitions[order.status]?.includes(nextStatus)) {
          throw new OrderError(
            409,
            "تغییر وضعیت سفارش با گردش کار فعلی سازگار نیست."
          );
        }

        if (
          nextStatus === "processing" &&
          order.payment_status !== "paid"
        ) {
          throw new OrderError(
            409,
            "سفارش تا تأیید پرداخت از سمت درگاه وارد پردازش نمی‌شود."
          );
        }

        if (nextStatus === "cancelled") {
          if (order.payment_status === "paid") {
            throw new OrderError(
              409,
              "برای لغو سفارش پرداخت‌شده، ابتدا فرایند بازپرداخت لازم است."
            );
          }

          const items = db.prepare(`
            SELECT product_id, quantity FROM order_items WHERE order_id = ?
          `).all(order.id);
          const restock = db.prepare(`
            UPDATE products
            SET stock = stock + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND stock <= ?
          `);

          for (const item of items) {
            const result = restock.run(
              item.quantity,
              item.product_id,
              Number.MAX_SAFE_INTEGER - item.quantity
            );

            if (result.changes !== 1) {
              throw new Error("Order product disappeared before cancellation.");
            }
          }
        }

        db.prepare(`
          UPDATE orders
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(nextStatus, order.id);

        db.prepare(`
          INSERT INTO order_status_history (
            id, order_id, actor_user_id, previous_status, next_status, note
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          order.id,
          req.session.user.id,
          order.status,
          nextStatus,
          note
        );

        return order.id;
      });

      const orderId = updateStatus();
      return res.json({
        success: true,
        data: readOrder(orderId),
      });
    } catch (error) {
      return handleOrderError(error, res, "Admin update order");
    }
  }
);

router.get("/:id", requireCustomer, (req, res) => {
  const validation = orderIdSchema.safeParse(req.params.id);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "شناسه سفارش معتبر نیست.",
    });
  }

  try {
    const owner = db.prepare(`
      SELECT user_id FROM orders WHERE id = ?
    `).get(validation.data);

    if (!owner || owner.user_id !== req.session.user.id) {
      return res.status(404).json({
        success: false,
        message: "سفارش پیدا نشد.",
      });
    }

    return res.json({
      success: true,
      data: readOrder(validation.data),
    });
  } catch (error) {
    return handleOrderError(error, res, "Get customer order");
  }
});

module.exports = router;
