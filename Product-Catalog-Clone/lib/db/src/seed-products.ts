import { db, pool } from "./index";
import { productsTable } from "./schema";
import { catalogProducts } from "./catalog-data";

async function seed() {
  if (catalogProducts.length < 100) {
    throw new Error(`Catalog validation failed: only ${catalogProducts.length} products available`);
  }

  const uniqueImages = new Set(catalogProducts.map((product) => product.imageUrl));
  if (uniqueImages.size < catalogProducts.length * 0.95) {
    throw new Error("Catalog validation failed: too many duplicate product images");
  }

  console.log(`Replacing catalog with ${catalogProducts.length} validated products...`);
  await db.delete(productsTable);

  for (let offset = 0; offset < catalogProducts.length; offset += 250) {
    await db.insert(productsTable).values(catalogProducts.slice(offset, offset + 250));
  }

  console.log(`Seeded ${catalogProducts.length} products.`);
  await pool.end();
}

seed().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});