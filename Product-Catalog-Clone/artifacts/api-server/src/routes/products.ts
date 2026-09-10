import { Router } from "express";
import { db, productsTable, priceBatchesTable } from "@workspace/db";
import { eq, ilike, and, desc, SQL } from "drizzle-orm";
import { z } from "zod";
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

const BulkPriceUpdateBody = z.object({
  updates: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1),
        price: z.number().int().nonnegative(), // cents
      }),
    )
    .min(1),
});

// POST /api/products/bulk-price-update — match products by ID (when given) or by
// exact name (case/accents-insensitive) as a fallback, and update their price.
// Used by the "atualizar preços via planilha" admin feature.
router.post("/products/bulk-price-update", async (req, res) => {
  try {
    const body = BulkPriceUpdateBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados inválidos" });

    const normalize = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const allProducts = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable);
    const idSet = new Set(allProducts.map((p) => p.id));
    const byName = new Map<string, number[]>();
    for (const p of allProducts) {
      const key = normalize(p.name);
      const list = byName.get(key) ?? [];
      list.push(p.id);
      byName.set(key, list);
    }

    let updated = 0;
    const notFound: string[] = [];

    for (const item of body.data.updates) {
      let targetIds: number[];
      if (item.id !== undefined && idSet.has(item.id)) {
        targetIds = [item.id];
      } else {
        targetIds = byName.get(normalize(item.name)) ?? [];
      }

      if (targetIds.length === 0) {
        notFound.push(item.name);
        continue;
      }
      for (const id of targetIds) {
        await db.update(productsTable).set({ price: item.price }).where(eq(productsTable.id, id));
        updated++;
      }
    }

    return res.json({ updated, notFound });
  } catch (err) {
    req.log.error(err, "bulkPriceUpdate error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

const BulkPercentageUpdateBody = z.object({
  percentage: z.number().min(-90).max(500),
  category: z.string().nullish(),
});

// POST /api/products/bulk-percentage-update - applies a flat % increase/decrease
// to all matching products' price, and stores a snapshot so it can be reverted.
router.post("/products/bulk-percentage-update", async (req, res) => {
  try {
    const body = BulkPercentageUpdateBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    const conditions = [eq(productsTable.active, true)];
    if (body.data.category) conditions.push(eq(productsTable.category, body.data.category));

    const targets = await db
      .select({ id: productsTable.id, price: productsTable.price })
      .from(productsTable)
      .where(and(...conditions));

    if (targets.length === 0) return res.status(400).json({ error: "Nenhum produto encontrado" });

    const factor = 1 + body.data.percentage / 100;
    const changes = targets.map((p) => ({
      id: p.id,
      oldPrice: p.price,
      newPrice: Math.max(1, Math.round(p.price * factor)),
    }));

    for (const c of changes) {
      await db.update(productsTable).set({ price: c.newPrice }).where(eq(productsTable.id, c.id));
    }

    const [batch] = await db
      .insert(priceBatchesTable)
      .values({
        percentage: body.data.percentage,
        category: body.data.category ?? null,
        productsAffected: changes.length,
        changes: JSON.stringify(changes),
      })
      .returning();

    return res.json({ batchId: batch.id, updated: changes.length });
  } catch (err) {
    req.log.error(err, "bulkPercentageUpdate error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/products/price-batches/latest - most recent non-reverted batch, if any
router.get("/products/price-batches/latest", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(priceBatchesTable)
      .where(eq(priceBatchesTable.reverted, false))
      .orderBy(desc(priceBatchesTable.createdAt))
      .limit(1);
    const batch = rows[0];
    if (!batch) return res.json(null);
    return res.json({
      id: batch.id,
      percentage: batch.percentage,
      category: batch.category,
      productsAffected: batch.productsAffected,
      createdAt: batch.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "getLatestPriceBatch error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/products/price-batches/:id/revert
router.post("/products/price-batches/:id/revert", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const [batch] = await db.select().from(priceBatchesTable).where(eq(priceBatchesTable.id, id)).limit(1);
    if (!batch) return res.status(404).json({ error: "Lote nao encontrado" });
    if (batch.reverted) return res.status(400).json({ error: "Esse lote ja foi revertido" });

    const changes = JSON.parse(batch.changes) as { id: number; oldPrice: number; newPrice: number }[];
    for (const c of changes) {
      await db.update(productsTable).set({ price: c.oldPrice }).where(eq(productsTable.id, c.id));
    }

    await db.update(priceBatchesTable).set({ reverted: true }).where(eq(priceBatchesTable.id, id));

    return res.json({ restored: changes.length });
  } catch (err) {
    req.log.error(err, "revertPriceBatch error");
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
