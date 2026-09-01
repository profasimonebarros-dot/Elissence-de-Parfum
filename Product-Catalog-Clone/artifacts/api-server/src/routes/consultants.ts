import { Router } from "express";
import { db, consultantsTable, ordersTable } from "@workspace/db";
import { eq, ilike, and, sql, SQL } from "drizzle-orm";
import {
  ListConsultantsQueryParams,
  CreateConsultantBody,
  UpdateConsultantBody,
  GetConsultantParams,
  UpdateConsultantParams,
  DeleteConsultantParams,
  GetConsultantStatsParams,
} from "@workspace/api-zod";

const router = Router();

// GET /api/consultants
router.get("/consultants", async (req, res) => {
  try {
    const query = ListConsultantsQueryParams.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: "Invalid query params" });

    const { active, search } = query.data;
    const conditions: SQL[] = [];
    if (active !== undefined) conditions.push(eq(consultantsTable.active, active));
    if (search) conditions.push(ilike(consultantsTable.name, `%${search}%`));

    const rows = await db
      .select()
      .from(consultantsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(consultantsTable.name);

    return res.json(rows.map(toConsultant));
  } catch (err) {
    req.log.error(err, "listConsultants error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/consultants
router.post("/consultants", async (req, res) => {
  try {
    const body = CreateConsultantBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const [row] = await db.insert(consultantsTable).values({
      name: body.data.name,
      email: body.data.email,
      phone: body.data.phone,
      cpf: body.data.cpf ?? null,
      address: body.data.address ?? null,
      commissionRate: body.data.commissionRate,
      active: body.data.active ?? true,
      notes: body.data.notes ?? null,
    }).returning();
    return res.status(201).json(toConsultant(row));
  } catch (err) {
    req.log.error(err, "createConsultant error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/consultants/:id
router.get("/consultants/:id", async (req, res) => {
  try {
    const params = GetConsultantParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db.select().from(consultantsTable).where(eq(consultantsTable.id, params.data.id));
    if (!row) return res.status(404).json({ error: "Consultant not found" });
    return res.json(toConsultant(row));
  } catch (err) {
    req.log.error(err, "getConsultant error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/consultants/:id
router.patch("/consultants/:id", async (req, res) => {
  try {
    const params = UpdateConsultantParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    const body = UpdateConsultantBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const updateData: Record<string, unknown> = {};
    if (body.data.name !== undefined) updateData.name = body.data.name;
    if (body.data.email !== undefined) updateData.email = body.data.email;
    if (body.data.phone !== undefined) updateData.phone = body.data.phone;
    if ("cpf" in body.data) updateData.cpf = body.data.cpf ?? null;
    if ("address" in body.data) updateData.address = body.data.address ?? null;
    if (body.data.commissionRate !== undefined) updateData.commissionRate = body.data.commissionRate;
    if (body.data.active !== undefined) updateData.active = body.data.active;
    if ("notes" in body.data) updateData.notes = body.data.notes ?? null;

    const [row] = await db.update(consultantsTable).set(updateData).where(eq(consultantsTable.id, params.data.id)).returning();
    if (!row) return res.status(404).json({ error: "Consultant not found" });
    return res.json(toConsultant(row));
  } catch (err) {
    req.log.error(err, "updateConsultant error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/consultants/:id
router.delete("/consultants/:id", async (req, res) => {
  try {
    const params = DeleteConsultantParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    await db.delete(consultantsTable).where(eq(consultantsTable.id, params.data.id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err, "deleteConsultant error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/consultants/:id/stats
router.get("/consultants/:id/stats", async (req, res) => {
  try {
    const params = GetConsultantStatsParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const [statsRow] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(total_amount), 0)::int`,
        totalCommission: sql<number>`coalesce(sum(commission_amount), 0)::int`,
        pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.consultantId, params.data.id));

    return res.json({
      consultantId: params.data.id,
      totalOrders: statsRow.totalOrders ?? 0,
      totalRevenue: statsRow.totalRevenue ?? 0,
      totalCommission: statsRow.totalCommission ?? 0,
      pendingOrders: statsRow.pendingOrders ?? 0,
    });
  } catch (err) {
    req.log.error(err, "getConsultantStats error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function toConsultant(row: typeof consultantsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf: row.cpf ?? null,
    address: row.address ?? null,
    commissionRate: row.commissionRate,
    active: row.active,
    notes: row.notes ?? null,
    accessToken: row.accessToken,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
