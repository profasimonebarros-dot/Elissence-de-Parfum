import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { consultantsTable } from "./consultants";

// recipientType is "admin" (notify the shop owner) or "consultant" (notify a specific consultant).
// consultantId is set only when recipientType is "consultant".
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  recipientType: text("recipient_type").notNull(),
  consultantId: integer("consultant_id").references(() => consultantsTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptionsTable).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;