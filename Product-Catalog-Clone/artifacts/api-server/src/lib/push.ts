import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"];
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are required for push notifications.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

async function sendToSubscription(sub: typeof pushSubscriptionsTable.$inferSelect, payload: PushPayload) {
  try {
    ensureConfigured();
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription expired or was revoked by the browser — clean it up.
      await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
    } else {
      logger.error(err, "push send error");
    }
  }
}

export async function notifyAdmin(payload: PushPayload) {
  const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.recipientType, "admin"));
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}

export async function notifyConsultant(consultantId: number, payload: PushPayload) {
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.consultantId, consultantId));
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}