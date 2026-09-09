import { Router } from "express";
import { db, ordersTable, orderItemsTable, consultantsTable, productsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  UpdateOrderBody,
  GetOrderParams,
  UpdateOrderParams,
  DeleteOrderParams,
} from "@workspace/api-zod";
import { notifyConsultant } from "../lib/push";

const router = Router();

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

// GET /api/orders
router.get("/orders", async (req, res) => {
  try {
    const query = ListOrdersQueryParams.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: "Invalid query params" });

    const conditions: SQL[] = [];
    if (query.data.consultantId !== undefined) {
      conditions.push(eq(ordersTable.consultantId, query.data.consultantId));
    }
    if (query.data.status !== undefined) {
      conditions.push(eq(ordersTable.status, query.data.status));
    }

    const rows = await db
      .select({
        order: ordersTable,
        consultantName: consultantsTable.name,
      })
      .from(ordersTable)
      .innerJoin(consultantsTable, eq(ordersTable.consultantId, consultantsTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(ordersTable.createdAt);

    return res.json(rows.map(({ order, consultantName }) => toOrder(order, consultantName)));
  } catch (err) {
    req.log.error(err, "listOrders error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/orders
router.post("/orders", async (req, res) => {
  try {
    const body = CreateOrderBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const [consultant] = await db.select().from(consultantsTable).where(eq(consultantsTable.id, body.data.consultantId));
    if (!consultant) return res.status(400).json({ error: "Consultant not found" });

    const productIds = body.data.items.map(i => i.productId);
    const productMap = new Map<number, typeof productsTable.$inferSelect>();
    for (const pid of productIds) {
      if (!productMap.has(pid)) {
        const [p] = await db.select().from(productsTable).where(eq(productsTable.id, pid));
        if (p) productMap.set(pid, p);
      }
    }

    let totalAmount = 0;
    const items = body.data.items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product " + item.productId + " not found");
      const unitPrice = product.price;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      return {
        productId: item.productId,
        productName: product.name,
        productBrand: product.brand,
        productImageUrl: product.imageUrl,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    const commissionAmount = Math.round(totalAmount * (consultant.commissionRate / 100));

    const [order] = await db.insert(ordersTable).values({
      consultantId: body.data.consultantId,
      status: "pending",
      paymentMethod: body.data.paymentMethod ?? null,
      totalAmount,
      commissionAmount,
      notes: body.data.notes ?? null,
    }).returning();

    await db.insert(orderItemsTable).values(
      items.map(item => ({ ...item, orderId: order.id }))
    );

    return res.status(201).json(toOrder(order, consultant.name));
  } catch (err) {
    req.log.error(err, "createOrder error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/orders/:id
router.get("/orders/:id", async (req, res) => {
  try {
    const params = GetOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db
      .select({ order: ordersTable, consultantName: consultantsTable.name })
      .from(ordersTable)
      .innerJoin(consultantsTable, eq(ordersTable.consultantId, consultantsTable.id))
      .where(eq(ordersTable.id, params.data.id));
    if (!row) return res.status(404).json({ error: "Order not found" });

    const itemRows = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, params.data.id));

    return res.json({
      ...toOrder(row.order, row.consultantName),
      items: itemRows.map(toOrderItem),
    });
  } catch (err) {
    req.log.error(err, "getOrder error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/orders/:id
router.patch("/orders/:id", async (req, res) => {
  try {
    const params = UpdateOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    const body = UpdateOrderBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const updateData: Record<string, unknown> = {};
    if (body.data.status !== undefined) updateData.status = body.data.status;
    if ("paymentMethod" in body.data) updateData.paymentMethod = body.data.paymentMethod ?? null;
    if ("notes" in body.data) updateData.notes = body.data.notes ?? null;

    const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, params.data.id)).returning();
    if (!order) return res.status(404).json({ error: "Order not found" });

    const [consultant] = await db.select().from(consultantsTable).where(eq(consultantsTable.id, order.consultantId));

    if (body.data.status !== undefined) {
      const label = STATUS_LABELS[body.data.status] ?? body.data.status;
      notifyConsultant(order.consultantId, {
        title: "Status do pedido atualizado",
        body: "Seu pedido #" + order.id + " agora esta: " + label,
      }).catch((err) => req.log.error(err, "notifyConsultant failed"));
    }

    return res.json(toOrder(order, consultant?.name ?? ""));
  } catch (err) {
    req.log.error(err, "updateOrder error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/orders/:id
router.delete("/orders/:id", async (req, res) => {
  try {
    const params = DeleteOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    await db.delete(ordersTable).where(eq(ordersTable.id, params.data.id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err, "deleteOrder error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function toOrder(row: typeof ordersTable.$inferSelect, consultantName: string) {
  return {
    id: row.id,
    consultantId: row.consultantId,
    consultantName,
    status: row.status,
    paymentMethod: row.paymentMethod ?? null,
    totalAmount: row.totalAmount,
    commissionAmount: row.commissionAmount,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOrderItem(row: typeof orderItemsTable.$inferSelect) {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    productName: row.productName,
    productBrand: row.productBrand,
    productImageUrl: row.productImageUrl,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
  };
}

export default router;