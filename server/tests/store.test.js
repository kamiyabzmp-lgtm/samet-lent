const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const customerTestPassword =
  process.env.KOROUSH_TEST_CUSTOMER_PASSWORD || "local-test-only-customer";
const adminTestPassword =
  process.env.KOROUSH_TEST_ADMIN_PASSWORD || "local-test-only-admin";

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "koroush-shop-tests-")
);
process.env.DATABASE_PATH = path.join(temporaryDirectory, "shop.sqlite");
process.env.SESSION_DATABASE_PATH = path.join(temporaryDirectory, "sessions.sqlite");
process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
process.env.CLIENT_URL = "http://shop.test";
process.env.NODE_ENV = "test";

const db = require("../database/schema");
const { migratePricing } = require("../database/migratePricing");
const { migrateOrders } = require("../database/migrateOrders");
const argon2 = require("argon2");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    mobile TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
      CHECK (role IN ('admin', 'staff', 'customer')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  );
`);
migratePricing(db);
migrateOrders(db);

const { calculateSalePrice } = require("../lib/pricing");
const app = require("../index");
const sessionDb = require("../database/sessionDb");

let server;
let baseUrl;
let adminCookie;

const origin = "http://shop.test";
const validAddress = {
  recipientName: "آزمایش مشتری",
  recipientMobile: "09123456789",
  province: "تهران",
  city: "تهران",
  addressLine: "خیابان آزمایشی، پلاک ۱",
  postalCode: "1234567890",
};

async function send(url, { method = "GET", cookie, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const result = await response.json();
  return { response, result };
}

function sessionCookie(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "Expected the server to set a session cookie.");
  return value.split(";")[0];
}

async function registerCustomer(mobile) {
  const { response } = await send("/api/auth/register", {
    method: "POST",
    body: { mobile, password: customerTestPassword },
  });
  assert.equal(response.status, 201);
  return sessionCookie(response);
}

async function loginCustomer(mobile) {
  const { response } = await send("/api/auth/customer/login", {
    method: "POST",
    body: { mobile, password: customerTestPassword },
  });
  assert.equal(response.status, 200);
  return sessionCookie(response);
}

before(async () => {
  const passwordHash = await argon2.hash(adminTestPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  db.prepare(`
    INSERT INTO users (id, mobile, password_hash, role)
    VALUES ('test-admin', '09999999999', ?, 'admin')
  `).run(passwordHash);

  db.prepare(`
    INSERT INTO products (
      id, name, slug, sku, category, base_price, price, stock,
      description, compatible_vehicles, images, tags, is_active
    )
    VALUES
      ('priced', 'محصول آزمایشی', 'test-priced', 'TEST-1', 'آزمایش', 1000, 1190, 3, '', '[]', '[]', '[]', 1),
      ('legacy', 'قیمت قدیمی', 'test-legacy', 'TEST-2', 'آزمایش', NULL, 555, 4, '', '[]', '[]', '[]', 1)
  `).run();

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const { response } = await send("/api/auth/login", {
    method: "POST",
    body: { mobile: "09999999999", password: adminTestPassword },
  });
  assert.equal(response.status, 200);
  adminCookie = sessionCookie(response);
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  db.close();
  sessionDb.close();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("sale-price calculation is exact and rejects unsafe values", () => {
  assert.equal(calculateSalePrice(1000), 1190);
  assert.equal(calculateSalePrice(50), 60);
  assert.equal(calculateSalePrice(null), null);
  assert.throws(() => calculateSalePrice(Number.MAX_SAFE_INTEGER), RangeError);
});

test("public catalog hides unverified legacy prices while admins can review them", async () => {
  const publicProducts = await send("/api/products");
  assert.equal(publicProducts.response.status, 200);
  const publicLegacy = publicProducts.result.data.find((item) => item.id === "legacy");
  assert.equal(publicLegacy.price, null);
  assert.equal(Object.hasOwn(publicLegacy, "legacyPrice"), false);

  const adminProducts = await send("/api/products/admin", { cookie: adminCookie });
  assert.equal(adminProducts.response.status, 200);
  const adminLegacy = adminProducts.result.data.find((item) => item.id === "legacy");
  assert.equal(adminLegacy.price, null);
  assert.equal(adminLegacy.legacyPrice, 555);
});

test("customer orders use server prices, are idempotent, and enforce ownership", async () => {
  const customerCookie = await registerCustomer("09111111111");
  const otherCustomerCookie = await registerCustomer("09222222222");
  const idempotencyKey = crypto.randomUUID();
  const body = {
    items: [{ productId: "priced", quantity: 1 }],
    shippingAddress: validAddress,
  };

  const forged = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {
      ...body,
      items: [{ ...body.items[0], price: 1 }],
    },
  });
  assert.equal(forged.response.status, 400);

  const created = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": idempotencyKey },
    body,
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.result));
  assert.equal(created.result.data.totalAmount, 1190);
  assert.equal(created.result.data.items[0].unitPrice, 1190);
  assert.equal(created.result.data.paymentStatus, "pending");

  const repeated = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": idempotencyKey },
    body,
  });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.result.data.id, created.result.data.id);
  assert.equal(db.prepare("SELECT stock FROM products WHERE id = 'priced'").get().stock, 2);

  const privateOrder = await send(`/api/orders/${created.result.data.id}`, {
    cookie: otherCustomerCookie,
  });
  assert.equal(privateOrder.response.status, 404);
});

test("unpriced items and insufficient stock cannot create orders", async () => {
  const customerCookie = await registerCustomer("09333333333");
  const insufficient = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {
      items: [{ productId: "priced", quantity: 99 }],
      shippingAddress: validAddress,
    },
  });
  assert.equal(insufficient.response.status, 409);

  const noBasePrice = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {
      items: [{ productId: "legacy", quantity: 1 }],
      shippingAddress: validAddress,
    },
  });
  assert.equal(noBasePrice.response.status, 409);
  assert.equal(db.prepare("SELECT price FROM products WHERE id = 'legacy'").get()?.price, 555);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM orders").get().count, 1);
});

test("admin status changes record history and cancellation restores stock", async () => {
  const customerCookie = await registerCustomer("09444444444");
  const created = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {
      items: [{ productId: "priced", quantity: 2 }],
      shippingAddress: validAddress,
    },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.result));

  const forbidden = await send("/api/orders/admin", { cookie: customerCookie });
  assert.equal(forbidden.response.status, 401);

  const unpaidProcessing = await send(`/api/orders/admin/${created.result.data.id}/status`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { status: "processing" },
  });
  assert.equal(unpaidProcessing.response.status, 409);

  const transitioned = await send(`/api/orders/admin/${created.result.data.id}/status`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { status: "cancelled", note: "تست بازگردانی موجودی" },
  });
  assert.equal(transitioned.response.status, 200);
  assert.equal(transitioned.result.data.status, "cancelled");
  assert.equal(transitioned.result.data.history.length, 2);
  assert.equal(db.prepare("SELECT stock FROM products WHERE id = 'priced'").get().stock, 2);
});

test("state-changing requests reject foreign origins", async () => {
  const customerCookie = await registerCustomer("09555555555");
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: {
      Origin: "http://attacker.test",
      Cookie: customerCookie,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ items: [], shippingAddress: validAddress }),
  });
  assert.equal(response.status, 403);
});

test("payment service requires a gateway and verifies amount, ownership, and callback once", async () => {
  const { createPaymentService, PaymentError } = require("../services/paymentService");
  const unavailable = createPaymentService({ db, gateway: null });
  assert.throws(
    () => unavailable.initiate({ orderId: crypto.randomUUID(), userId: "test-admin" }),
    (error) => error instanceof PaymentError && error.status === 503
  );

  const customerCookie = await loginCustomer("09111111111");
  const created = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {
      items: [{ productId: "priced", quantity: 1 }],
      shippingAddress: validAddress,
    },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.result));

  const gateway = {
    createPayment: ({ amount }) => ({
      provider: "test-adapter",
      reference: `ref-${amount}`,
      redirectUrl: "https://gateway.invalid/pay",
    }),
    verifyCallback: (notification) => notification,
  };
  const service = createPaymentService({ db, gateway });
  assert.throws(
    () => service.initiate({ orderId: created.result.data.id, userId: "test-admin" }),
    (error) => error instanceof PaymentError && error.status === 404
  );
  const intent = service.initiate({
    orderId: created.result.data.id,
    userId: db.prepare("SELECT user_id FROM orders WHERE id = ?").get(created.result.data.id).user_id,
  });
  assert.equal(intent.status, "pending");

  const unavailableEndpoint = await send(
    `/api/payments/orders/${created.result.data.id}/payment`,
    {
      method: "POST",
      cookie: customerCookie,
      body: {},
    }
  );
  assert.equal(unavailableEndpoint.response.status, 503);

  const callback = {
    verified: true,
    provider: "test-adapter",
    reference: `ref-${created.result.data.totalAmount}`,
    orderId: created.result.data.id,
    amount: created.result.data.totalAmount,
    currency: "IRR",
    status: "paid",
  };
  assert.throws(
    () => service.verifyCallback({ ...callback, amount: callback.amount + 1 }),
    (error) => error instanceof PaymentError && error.status === 409
  );

  const verified = service.verifyCallback(callback);
  assert.equal(verified.repeated, false);
  assert.equal(service.verifyCallback(callback).repeated, true);
  const storedOrder = db.prepare("SELECT payment_status, status FROM orders WHERE id = ?").get(callback.orderId);
  assert.deepEqual(storedOrder, { payment_status: "paid", status: "processing" });
});

test("order migration can run repeatedly without changing existing records", () => {
  const productsBefore = db.prepare("SELECT id, stock, price FROM products ORDER BY id").all();
  const usersBefore = db.prepare("SELECT id, mobile, role FROM users ORDER BY id").all();
  const ordersBefore = db.prepare("SELECT id, total_amount FROM orders ORDER BY id").all();

  migrateOrders(db);

  assert.deepEqual(db.prepare("SELECT id, stock, price FROM products ORDER BY id").all(), productsBefore);
  assert.deepEqual(db.prepare("SELECT id, mobile, role FROM users ORDER BY id").all(), usersBefore);
  assert.deepEqual(db.prepare("SELECT id, total_amount FROM orders ORDER BY id").all(), ordersBefore);
});

test("disabled customer accounts cannot reuse existing sessions", async () => {
  const customerCookie = await loginCustomer("09111111111");
  db.prepare("UPDATE users SET is_active = 0 WHERE mobile = ?").run("09111111111");

  const response = await send("/api/orders", {
    method: "POST",
    cookie: customerCookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {
      items: [{ productId: "priced", quantity: 1 }],
      shippingAddress: validAddress,
    },
  });

  assert.equal(response.response.status, 401);
});
