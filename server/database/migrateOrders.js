function migrateOrders(db) {
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        idempotency_key TEXT NOT NULL UNIQUE,
        request_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_payment'
          CHECK (status IN ('pending_payment', 'processing', 'shipped', 'delivered', 'cancelled')),
        payment_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
        currency TEXT NOT NULL DEFAULT 'IRR' CHECK (currency = 'IRR'),
        subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
        shipping_amount INTEGER NOT NULL DEFAULT 0 CHECK (shipping_amount = 0),
        total_amount INTEGER NOT NULL CHECK (total_amount = subtotal + shipping_amount),
        recipient_name TEXT NOT NULL,
        recipient_mobile TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user_created
      ON orders(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_orders_status_created
      ON orders(status, created_at DESC);

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
        line_total INTEGER NOT NULL CHECK (line_total = unit_price * quantity),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_order_items_order
      ON order_items(order_id);

      CREATE TABLE IF NOT EXISTS order_status_history (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        previous_status TEXT,
        next_status TEXT NOT NULL
          CHECK (next_status IN ('pending_payment', 'processing', 'shipped', 'delivered', 'cancelled')),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_order_history_order_created
      ON order_status_history(order_id, created_at);

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        provider TEXT NOT NULL DEFAULT 'unconfigured',
        provider_reference TEXT UNIQUE,
        redirect_url TEXT,
        amount INTEGER NOT NULL CHECK (amount >= 0),
        currency TEXT NOT NULL DEFAULT 'IRR' CHECK (currency = 'IRR'),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
        verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payments_order
      ON payments(order_id, created_at);
    `);

    const paymentColumns = db.prepare("PRAGMA table_info(payments)").all();
    if (!paymentColumns.some((column) => column.name === "redirect_url")) {
      db.exec("ALTER TABLE payments ADD COLUMN redirect_url TEXT");
    }
  });

  migrate();
}

module.exports = { migrateOrders };

if (require.main === module) {
  const db = require("./db");

  try {
    migrateOrders(db);
    console.log("Additive order, payment, and status-history migration completed.");
  } catch (error) {
    console.error("Order migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
