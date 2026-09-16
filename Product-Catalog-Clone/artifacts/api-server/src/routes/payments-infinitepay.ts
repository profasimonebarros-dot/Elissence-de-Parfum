import { Router } from "express";
import { db, ordersTable, orderItemsTable, consultantsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

async function getConsultantByToken(token: string) {
  const [row] = await db.select().from(consultantsTable).where(eq(consultantsTable.accessToken, token));
  return row ?? null;
}

// POST /api/portal/:token/orders/:orderId/infinitepay-link
// Creates an InfinitePay checkout link for an order already placed by this consultant.
router.post("/portal/:token/orders/:orderId/infinitepay-link", async (req, res) => {
  try {
    const consultant = await getConsultantByToken(req.params.token);
    if (!consultant || !consultant.active) {
      return res.status(404).json({ error: "Link invalido ou inativo" });
    }

    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Pedido invalido" });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order || order.consultantId !== consultant.id) {
      return res.status(404).json({ error: "Pedido nao encontrado" });
    }

    const [settings] = await db.select().from(settingsTable).limit(1);
    if (!settings?.infinitepayEnabled || !settings.infinitepayHandle) {
      return res.status(400).json({ error: "InfinitePay nao esta configurado" });
    }

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    if (items.length === 0) {
      return res.status(400).json({ error: "Pedido sem itens" });
    }

    const portalUrl = process.env["PORTAL_URL"] ?? "";
    const apiUrl = process.env["API_URL"] ?? "";

    const payload = {
      handle: settings.infinitepayHandle,
      order_nsu: String(order.id),
      redirect_url: portalUrl + "/portal/" + consultant.accessToken + "?pedido=" + order.id,
      webhook_url: apiUrl + "/api/payments/infinitepay/webhook",
      items: items.map((item) => ({
        quantity: item.quantity,
        price: item.unitPrice,
        description: item.productName,
      })),
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, text }, "infinitepay create-link failed");
      return res.status(502).json({ error: "Falha ao criar link de pagamento" });
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      return res.status(502).json({ error: "Resposta inesperada da InfinitePay" });
    }

    await db.update(ordersTable).set({ paymentMethod: "infinitepay" }).where(eq(ordersTable.id, order.id));

    return res.json({ url: data.url });
  } catch (err) {
    req.log.error(err, "createInfinitepayLink error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

const WebhookBody = z.object({
  invoice_slug: z.string().optional(),
  order_nsu: z.string(),
  transaction_nsu: z.string().optional(),
  amount: z.number().optional(),
  paid_amount: z.number().optional(),
  capture_method: z.string().optional(),
});

// POST /api/payments/infinitepay/webhook - called by InfinitePay when a payment is approved.
router.post("/payments/infinitepay/webhook", async (req, res) => {
  try {
    const body = WebhookBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "invalid payload" });

    const orderId = Number(body.data.order_nsu);
    if (!Number.isInteger(orderId)) return res.status(400).json({ error: "invalid order_nsu" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) return res.status(400).json({ error: "order not found" });

    await db
      .update(ordersTable)
      .set({
        status: "confirmed",
        paymentMethod: "infinitepay",
        infinitepaySlug: body.data.invoice_slug ?? order.infinitepaySlug,
        infinitepayTransactionNsu: body.data.transaction_nsu ?? order.infinitepayTransactionNsu,
      })
      .where(eq(ordersTable.id, order.id));

    return res.status(200).json({ success: true });
  } catch (err) {
    req.log.error(err, "infinitepayWebhook error");
    return res.status(400).json({ error: "webhook processing failed" });
  }
});

export default router;