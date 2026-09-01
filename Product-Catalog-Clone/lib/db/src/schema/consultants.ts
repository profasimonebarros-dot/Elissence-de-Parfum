import { pgTable, text, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const consultantsTable = pgTable("consultants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  cpf: text("cpf"),
  address: text("address"),
  commissionRate: real("commission_rate").notNull().default(0), // percentage 0-100
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  // Unguessable token used for the consultant's public order-taking link (/portal/:token).
  // DB-level default so existing rows are backfilled automatically when the column is added.
  accessToken: text("access_token").notNull().unique().default(sql`gen_random_uuid()::text`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConsultantSchema = createInsertSchema(consultantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsultant = z.infer<typeof insertConsultantSchema>;
export type Consultant = typeof consultantsTable.$inferSelect;
