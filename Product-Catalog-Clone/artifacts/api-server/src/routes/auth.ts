import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

const router = Router();

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) throw new Error("JWT_SECRET environment variable is required but was not provided.");
  return secret;
}

const SetupBody = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const LoginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// POST /api/auth/setup - creates the first administrator.
// Only works if no user exists yet in the database (protects against misuse afterwards).
router.post("/auth/setup", async (req, res) => {
  try {
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    if (existing) return res.status(403).json({ error: "Ja existe um administrador cadastrado." });

    const body = SetupBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    const passwordHash = await bcrypt.hash(body.data.password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ name: body.data.name, email: body.data.email.toLowerCase(), passwordHash, role: "admin" })
      .returning();

    return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    req.log.error(err, "authSetup error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login - returns a Bearer token in the response body (not a cookie),
// since the frontend and backend run on different subdomains and modern browsers
// increasingly block cross-site cookies.
router.post("/auth/login", async (req, res) => {
  try {
    const body = LoginBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, body.data.email.toLowerCase()))
      .limit(1);

    if (!user || !user.active) return res.status(401).json({ error: "Email ou senha invalidos" });

    const valid = await bcrypt.compare(body.data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Email ou senha invalidos" });

    const token = jwt.sign({ sub: user.id, role: user.role }, getJwtSecret(), { expiresIn: "7d" });

    return res.json({ token, id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    req.log.error(err, "authLogin error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/change-password
router.post("/auth/change-password", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = ChangePasswordBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Dados invalidos" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) return res.status(401).json({ error: "Nao autenticado" });

    const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Senha atual incorreta" });

    const passwordHash = await bcrypt.hash(body.data.newPassword, 12);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

    return res.status(204).send();
  } catch (err) {
    req.log.error(err, "changePassword error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout - with token auth this is client-side (drop the stored token),
// this endpoint exists for symmetry and future use (e.g. token blocklist).
router.post("/auth/logout", (_req, res) => {
  return res.status(204).send();
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user || !user.active) return res.status(401).json({ error: "Nao autenticado" });

    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    req.log.error(err, "authMe error");
    return res.status(401).json({ error: "Nao autenticado" });
  }
});

export default router;