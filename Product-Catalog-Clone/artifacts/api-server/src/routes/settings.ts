import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const PIX_KEY_TYPES = ["cpf", "cnpj", "email", "telefone", "aleatoria"] as const;

const UpdateSettingsBody = z.object({
  pixKey: z.string().trim().min(1).nullable().optional(),
  pixKeyType: z.enum(PIX_KEY_TYPES).nullable().optional(),
  pixRecipientName: z.string().trim().min(1).nullable().optional(),
  pixEnabled: z.boolean().optional(),
  dinheiroEnabled: z.boolean().optional(),
  cartaoCreditoEnabled: z.boolean().optional(),
  cartaoDebitoEnabled: z.boolean().optional(),
  boletoEnabled: z.boolean().optional(),
  transferenciaEnabled: z.boolean().optional(),
});

async function getOrCreateSettings() {
  const [row] = await db.select().from(settingsTable).limit(1);
  if (row) return row;
  const [created] = await db.insert(settingsTable).values({}).returning();
  return created;
}

function toSettings(row: typeof settingsTable.$inferSelect) {
  return {
    pixKey: row.pixKey ?? null,
    pixKeyType: row.pixKeyType ?? null,
    pixRecipientName: row.pixRecipientName ?? null,
    pixEnabled: row.pixEnabled,
    dinheiroEnabled: row.dinheiroEnabled,
    cartaoCreditoEnabled: row.cartaoCreditoEnabled,
    cartaoDebitoEnabled: row.cartaoDebitoEnabled,
    boletoEnabled: row.boletoEnabled,
    transferenciaEnabled: row.transferenciaEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/settings — public (no auth in this app); used by the admin settings
// page AND by the consultant portal to display the PIX key at checkout.
router.get("/settings", async (req, res) => {
  try {
    const row = await getOrCreateSettings();
    return res.json(toSettings(row));
  } catch (err) {
    req.log.error(err, "getSettings error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/settings
router.patch("/settings", async (req, res) => {
  try {
    const body = UpdateSettingsBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados inválidos" });

    const existing = await getOrCreateSettings();

    const updateData: Record<string, unknown> = {};
    if ("pixKey" in body.data) updateData.pixKey = body.data.pixKey ?? null;
    if ("pixKeyType" in body.data) updateData.pixKeyType = body.data.pixKeyType ?? null;
    if ("pixRecipientName" in body.data) updateData.pixRecipientName = body.data.pixRecipientName ?? null;
    if (body.data.pixEnabled !== undefined) updateData.pixEnabled = body.data.pixEnabled;
    if (body.data.dinheiroEnabled !== undefined) updateData.dinheiroEnabled = body.data.dinheiroEnabled;
    if (body.data.cartaoCreditoEnabled !== undefined) updateData.cartaoCreditoEnabled = body.data.cartaoCreditoEnabled;
    if (body.data.cartaoDebitoEnabled !== undefined) updateData.cartaoDebitoEnabled = body.data.cartaoDebitoEnabled;
    if (body.data.boletoEnabled !== undefined) updateData.boletoEnabled = body.data.boletoEnabled;
    if (body.data.transferenciaEnabled !== undefined) updateData.transferenciaEnabled = body.data.transferenciaEnabled;

    const [row] = await db
      .update(settingsTable)
      .set(updateData)
      .where(eq(settingsTable.id, existing.id))
      .returning();

    return res.json(toSettings(row));
  } catch (err) {
    req.log.error(err, "updateSettings error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
