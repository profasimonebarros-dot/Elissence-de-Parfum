import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
import {
  ListProductsQueryParams,
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router = Router();

// GET /api/products
router.get("/products", async (req, res) => {
  try {
    const query = ListProductsQueryParams.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: "Invalid query params" });
    }
    const { category, search, active } = query.data;
    const conditions: SQL[] = [];
    if (category) conditions.push(eq(productsTable.category, category));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (active !== undefined) conditions.push(eq(productsTable.active, active));

    const rows = await db
      .select()
      .from(productsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(productsTable.name);

    return res.json(rows.map(toProduct));
  } catch (err) {
    req.log.error(err, "listProducts error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/products
router.post("/products", async (req, res) => {
  try {
    const body = CreateProductBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid body" });
    }
    const [row] = await db.insert(productsTable).values({
      name: body.data.name,
      brand: body.data.brand,
      category: body.data.category,
      description: body.data.description ?? null,
      price: body.data.price,
      originalPrice: body.data.originalPrice ?? null,
      imageUrl: body.data.imageUrl,
      active: body.data.active ?? true,
    }).returning();
    return res.status(201).json(toProduct(row));
  } catch (err) {
    req.log.error(err, "createProduct error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const params = GetProductParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
    if (!row) return res.status(404).json({ error: "Product not found" });
    return res.json(toProduct(row));
  } catch (err) {
    req.log.error(err, "getProduct error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/products/:id
router.patch("/products/:id", async (req, res) => {
  try {
    const params = UpdateProductParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    const body = UpdateProductBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const updateData: Record<string, unknown> = {};
    if (body.data.name !== undefined) updateData.name = body.data.name;
    if (body.data.brand !== undefined) updateData.brand = body.data.brand;
    if (body.data.category !== undefined) updateData.category = body.data.category;
    if (body.data.description !== undefined) updateData.description = body.data.description;
    if (body.data.price !== undefined) updateData.price = body.data.price;
    if ("originalPrice" in body.data) updateData.originalPrice = body.data.originalPrice ?? null;
    if (body.data.imageUrl !== undefined) updateData.imageUrl = body.data.imageUrl;
    if (body.data.active !== undefined) updateData.active = body.data.active;

    const [row] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id)).returning();
    if (!row) return res.status(404).json({ error: "Product not found" });
    return res.json(toProduct(row));
  } catch (err) {
    req.log.error(err, "updateProduct error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/products/:id
router.delete("/products/:id", async (req, res) => {
  try {
    const params = DeleteProductParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err, "deleteProduct error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function toProduct(row: typeof productsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description ?? null,
    price: row.price,
    originalPrice: row.originalPrice ?? null,
    imageUrl: row.imageUrl,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
