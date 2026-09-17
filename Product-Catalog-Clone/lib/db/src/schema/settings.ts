import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

// Singleton-style table: a single row (id=1) holds the store's configuration.
export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  pixKey: text("pix_key"),
  pixKeyType: text("pix_key_type"), // 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
  pixRecipientName: text("pix_recipient_name"),
  pixMerchantCity: text("pix_merchant_city"),
  // Which payment methods are offered to consultants at checkout.
  pixEnabled: boolean("pix_enabled").notNull().default(true),
  dinheiroEnabled: boolean("dinheiro_enabled").notNull().default(true),
  cartaoCreditoEnabled: boolean("cartao_credito_enabled").notNull().default(true),
  cartaoDebitoEnabled: boolean("cartao_debito_enabled").notNull().default(true),
  boletoEnabled: boolean("boleto_enabled").notNull().default(true),
  transferenciaEnabled: boolean("transferencia_enabled").notNull().default(true),
  infinitepayEnabled: boolean("infinitepay_enabled").notNull().default(false),
  infinitepayHandle: text("infinitepay_handle"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Settings = typeof settingsTable.$inferSelect;
