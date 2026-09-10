import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

const router = Router();

const CreateUserBody = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

function toUser(row: typeof usersTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/users - list all admin users
router.get("/users", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    return res.json(rows.map(toUser));
  } catch (err) {
    req.log.error(err, "listUsers error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users - create a new admin user
router.post("/users", requireAuth, async (req, res) => {
  try {
    const body = CreateUserBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, body.data.email.toLowerCase()))
      .limit(1);
    if (existing) return res.status(409).json({ error: "Ja existe um usuario com esse email" });

    const passwordHash = await bcrypt.hash(body.data.password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ name: body.data.name, email: body.data.email.toLowerCase(), passwordHash, role: "admin" })
      .returning();

    return res.status(201).json(toUser(user));
  } catch (err) {
    req.log.error(err, "createUser error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/:id - toggle active status
router.patch("/users/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const ActiveBody = z.object({ active: z.boolean() });
    const body = ActiveBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    if (id === req.user!.id && !body.data.active) {
      return res.status(400).json({ error: "Voce nao pode desativar sua propria conta" });
    }

    const [user] = await db.update(usersTable).set({ active: body.data.active }).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "Usuario nao encontrado" });

    return res.json(toUser(user));
  } catch (err) {
    req.log.error(err, "updateUser error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;