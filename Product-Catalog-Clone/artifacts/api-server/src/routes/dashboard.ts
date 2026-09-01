import { Router } from "express";
import { db, productsTable, consultantsTable, ordersTable } from "@workspace/db";
import { sql, desc, eq } from "drizzle-orm";

const router = Router();

// GET /api/dashboard/summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const [[productCount], [consultantCount], [orderStats]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(productsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(consultantsTable),
      db.select({
        totalOrders: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(total_amount), 0)::int`,
        totalCommissions: sql<number>`coalesce(sum(commission_amount), 0)::int`,
        pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
        deliveredOrders: sql<number>`count(*) filter (where status = 'delivered')::int`,
      }).from(ordersTable),
    ]);

    return res.json({
      totalProducts: productCount.count ?? 0,
      totalConsultants: consultantCount.count ?? 0,
      totalOrders: orderStats.totalOrders ?? 0,
      totalRevenue: orderStats.totalRevenue ?? 0,
      totalCommissions: orderStats.totalCommissions ?? 0,
      pendingOrders: orderStats.pendingOrders ?? 0,
      deliveredOrders: orderStats.deliveredOrders ?? 0,
    });
  } catch (err) {
    req.log.error(err, "getDashboardSummary error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/top-consultants
router.get("/dashboard/top-consultants", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: consultantsTable.id,
        name: consultantsTable.name,
        commissionRate: consultantsTable.commissionRate,
        totalOrders: sql<number>`count(${ordersTable.id})::int`,
        totalRevenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::int`,
      })
      .from(consultantsTable)
      .leftJoin(ordersTable, eq(ordersTable.consultantId, consultantsTable.id))
      .groupBy(consultantsTable.id)
      .orderBy(desc(sql`coalesce(sum(${ordersTable.totalAmount}), 0)`))
      .limit(5);

    return res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      commissionRate: r.commissionRate,
      totalOrders: r.totalOrders ?? 0,
      totalRevenue: r.totalRevenue ?? 0,
    })));
  } catch (err) {
    req.log.error(err, "getTopConsultants error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/recent-orders
router.get("/dashboard/recent-orders", async (req, res) => {
  try {
    const rows = await db
      .select({ order: ordersTable, consultantName: consultantsTable.name })
      .from(ordersTable)
      .innerJoin(consultantsTable, eq(ordersTable.consultantId, consultantsTable.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(10);

    return res.json(rows.map(({ order, consultantName }) => ({
      id: order.id,
      consultantId: order.consultantId,
      consultantName,
      status: order.status,
      totalAmount: order.totalAmount,
      commissionAmount: order.commissionAmount,
      notes: order.notes ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "getRecentOrders error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
