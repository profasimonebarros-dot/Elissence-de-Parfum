import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

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

// POST /api/auth/setup â€” cria o primeiro administrador.
// So funciona se ainda nao existir nenhum usuario no banco (protege contra uso indevido depois).
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

// POST /api/auth/login
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

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_MS,
    });

    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    req.log.error(err, "authLogin error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.status(204).send();
});

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Nao autenticado" });

    const payload = jwt.verify(token, getJwtSecret()) as unknown as { sub: number; role: string };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);
    if (!user || !user.active) return res.status(401).json({ error: "Nao autenticado" });

    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch {
    return res.status(401).json({ error: "Nao autenticado" });
  }
});

export default router;