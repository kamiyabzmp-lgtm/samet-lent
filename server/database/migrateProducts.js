
const db = require("./schema");
const products = require("../data/products");

// آماده‌سازی دستور ثبت محصول
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (
    id,
    name,
    slug,
    sku,
    brand,
    category,
    price,
    stock,
    description,
    compatible_vehicles,
    images,
    tags,
    is_active
  )
  VALUES (
    @id,
    @name,
    @slug,
    @sku,
    @brand,
    @category,
    @price,
    @stock,
    @description,
    @compatibleVehicles,
    @images,
    @tags,
    @isActive
  )
`);

// انتقال همه محصولات در یک تراکنش
const migrate = db.transaction((items) => {
  let inserted = 0;

  for (const product of items) {
    const result = insertProduct.run({
      ...product,
      compatibleVehicles: JSON.stringify(
        product.compatibleVehicles || []
      ),
      images: JSON.stringify(product.images || []),
      tags: JSON.stringify(product.tags || []),
      isActive: product.isActive ? 1 : 0,
    });

    inserted += result.changes;
  }

  return inserted;
});

try {
  const insertedCount = migrate(products);

  console.log("Product migration completed.");
  console.log(`Products in source: ${products.length}`);
  console.log(`New products inserted: ${insertedCount}`);
  console.log("Existing products were not duplicated.");
} catch (error) {
  console.error("Product migration failed:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
