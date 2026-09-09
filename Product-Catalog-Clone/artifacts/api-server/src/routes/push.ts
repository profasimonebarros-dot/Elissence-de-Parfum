import { Router } from "express";
import { db, pushSubscriptionsTable, consultantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SubscriptionBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

async function getConsultantByToken(token: string) {
  const [row] = await db.select().from(consultantsTable).where(eq(consultantsTable.accessToken, token));
  return row ?? null;
}

// GET /api/push/vapid-public-key — public, needed by both admin and consultant portal to subscribe
router.get("/push/vapid-public-key", (req, res) => {
  const key = process.env["VAPID_PUBLIC_KEY"];
  if (!key) return res.status(500).json({ error: "VAPID not configured" });
  return res.json({ publicKey: key });
});

// POST /api/push/subscribe — admin subscribes (requires login)
router.post("/push/subscribe", requireAuth, async (req, res) => {
  try {
    const body = SubscriptionBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    await db
      .insert(pushSubscriptionsTable)
      .values({
        recipientType: "admin",
        consultantId: null,
        endpoint: body.data.endpoint,
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { p256dh: body.data.keys.p256dh, auth: body.data.keys.auth },
      });

    return res.status(204).send();
  } catch (err) {
    req.log.error(err, "pushSubscribeAdmin error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/portal/:token/push/subscribe — consultant subscribes (token-scoped, no login)
router.post("/portal/:token/push/subscribe", async (req, res) => {
  try {
    const consultant = await getConsultantByToken(req.params.token);
    if (!consultant) return res.status(404).json({ error: "Link invalido" });

    const body = SubscriptionBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    await db
      .insert(pushSubscriptionsTable)
      .values({
        recipientType: "consultant",
        consultantId: consultant.id,
        endpoint: body.data.endpoint,
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { p256dh: body.data.keys.p256dh, auth: body.data.keys.auth, consultantId: consultant.id, recipientType: "consultant" },
      });

    return res.status(204).send();
  } catch (err) {
    req.log.error(err, "pushSubscribeConsultant error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;