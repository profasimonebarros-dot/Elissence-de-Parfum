import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { consultantsTable } from "./consultants";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  consultantId: integer("consultant_id").notNull().references(() => consultantsTable.id),
  status: text("status").notNull().default("pending"), // pending, confirmed, delivered, cancelled
  paymentMethod: text("payment_method"), // pix, dinheiro, cartao_credito, cartao_debito, boleto, transferencia
  totalAmount: integer("total_amount").notNull().default(0), // cents
  commissionAmount: integer("commission_amount").notNull().default(0), // cents
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productBrand: text("product_brand").notNull(),
  productImageUrl: text("product_image_url").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(), // cents at time of order
  subtotal: integer("subtotal").notNull(), // cents
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
