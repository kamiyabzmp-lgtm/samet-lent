
function migratePricing(db) {
  const columns = db.prepare("PRAGMA table_info(products)").all();
  const columnNames = columns.map((column) => column.name);

  if (columnNames.includes("base_price")) {
    return false;
  } else {
    const migrate = db.transaction(() => {
      db.exec(`
        CREATE TABLE products_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          sku TEXT NOT NULL UNIQUE,
          brand TEXT,
          category TEXT NOT NULL,
          base_price INTEGER
            CHECK (base_price IS NULL OR base_price >= 0),
          price INTEGER
            CHECK (price IS NULL OR price >= 0),
          stock INTEGER NOT NULL DEFAULT 0
            CHECK (stock >= 0),
          description TEXT DEFAULT '',
          compatible_vehicles TEXT NOT NULL DEFAULT '[]',
          images TEXT NOT NULL DEFAULT '[]',
          tags TEXT NOT NULL DEFAULT '[]',
          is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO products_new (
          id, name, slug, sku, brand, category,
          base_price, price, stock, description,
          compatible_vehicles, images, tags, is_active,
          created_at, updated_at
        )
        SELECT
          id, name, slug, sku, brand, category,
          NULL, price, stock, description,
          compatible_vehicles, images, tags, is_active,
          created_at, updated_at
        FROM products;

        DROP TABLE products;
        ALTER TABLE products_new RENAME TO products;

        CREATE INDEX idx_products_sku ON products(sku);
        CREATE INDEX idx_products_active ON products(is_active);
        CREATE INDEX idx_products_category ON products(category);
      `);
    });

    migrate();
    return true;
  }
}

module.exports = { migratePricing };

if (require.main === module) {
  const db = require("./db");

  try {
    const changed = migratePricing(db);
    console.log(
      changed
        ? "Pricing migration completed successfully."
        : "Pricing migration already applied."
    );
    if (changed) {
      console.log("Existing product prices were preserved.");
    }
  } catch (error) {
    console.error("Pricing migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
