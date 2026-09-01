import { Router } from "express";
import { db, consultantsTable, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const OrderItemInput = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const CreatePortalOrderBody = z.object({
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemInput).min(1),
});

async function getConsultantByToken(token: string) {
  const [row] = await db.select().from(consultantsTable).where(eq(consultantsTable.accessToken, token));
  return row ?? null;
}

// GET /api/portal/:token — consultant identity + summary stats
router.get("/portal/:token", async (req, res) => {
  try {
    const consultant = await getConsultantByToken(req.params.token);
    if (!consultant || !consultant.active) {
      return res.status(404).json({ error: "Link inválido ou inativo" });
    }

    const [statsRow] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(total_amount), 0)::int`,
        totalCommission: sql<number>`coalesce(sum(commission_amount), 0)::int`,
        pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.consultantId, consultant.id));

    return res.json({
      id: consultant.id,
      name: consultant.name,
      commissionRate: consultant.commissionRate,
      totalOrders: statsRow?.totalOrders ?? 0,
      totalRevenue: statsRow?.totalRevenue ?? 0,
      totalCommission: statsRow?.totalCommission ?? 0,
      pendingOrders: statsRow?.pendingOrders ?? 0,
    });
  } catch (err) {
    req.log.error(err, "getPortalConsultant error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/portal/:token/orders — this consultant's order history
router.get("/portal/:token/orders", async (req, res) => {
  try {
    const consultant = await getConsultantByToken(req.params.token);
    if (!consultant) return res.status(404).json({ error: "Link inválido" });

    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.consultantId, consultant.id))
      .orderBy(desc(ordersTable.createdAt));

    const result = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));

        return {
          id: order.id,
          status: order.status,
          paymentMethod: order.paymentMethod ?? null,
          totalAmount: order.totalAmount,
          commissionAmount: order.commissionAmount,
          notes: order.notes ?? null,
          createdAt: order.createdAt.toISOString(),
          items: items.map((it) => ({
            productName: it.productName,
            productBrand: it.productBrand,
            productImageUrl: it.productImageUrl,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
          })),
        };
      }),
    );

    return res.json(result);
  } catch (err) {
    req.log.error(err, "listPortalOrders error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/portal/:token/orders — consultant places a new order for herself
router.post("/portal/:token/orders", async (req, res) => {
  try {
    const consultant = await getConsultantByToken(req.params.token);
    if (!consultant || !consultant.active) {
      return res.status(404).json({ error: "Link inválido ou inativo" });
    }

    const body = CreatePortalOrderBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados inválidos" });

    const productMap = new Map<number, typeof productsTable.$inferSelect>();
    for (const item of body.data.items) {
      if (!productMap.has(item.productId)) {
        const [p] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (p) productMap.set(item.productId, p);
      }
    }

    let totalAmount = 0;
    const items = body.data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Produto ${item.productId} não encontrado`);
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      return {
        productId: item.productId,
        productName: product.name,
        productBrand: product.brand,
        productImageUrl: product.imageUrl,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
      };
    });

    const commissionAmount = Math.round(totalAmount * (consultant.commissionRate / 100));

    const [order] = await db
      .insert(ordersTable)
      .values({
        consultantId: consultant.id,
        status: "pending",
        paymentMethod: body.data.paymentMethod ?? null,
        totalAmount,
        commissionAmount,
        notes: body.data.notes ?? null,
      })
      .returning();

    await db.insert(orderItemsTable).values(items.map((item) => ({ ...item, orderId: order.id })));

    return res.status(201).json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      commissionAmount: order.commissionAmount,
    });
  } catch (err) {
    req.log.error(err, "createPortalOrder error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
