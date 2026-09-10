import { pgTable, text, serial, timestamp, boolean, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Stores a snapshot of prices before a bulk (percentage) price update, so the
// admin can revert it if something goes wrong. `changes` is a JSON string:
// [{ id: number, oldPrice: number, newPrice: number }]
export const priceBatchesTable = pgTable("price_batches", {
  id: serial("id").primaryKey(),
  percentage: real("percentage").notNull(),
  category: text("category"),
  productsAffected: integer("products_affected").notNull(),
  changes: text("changes").notNull(),
  reverted: boolean("reverted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPriceBatchSchema = createInsertSchema(priceBatchesTable).omit({ id: true, createdAt: true });
export type InsertPriceBatch = z.infer<typeof insertPriceBatchSchema>;
export type PriceBatch = typeof priceBatchesTable.$inferSelect;