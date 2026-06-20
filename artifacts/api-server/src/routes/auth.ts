import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { generateToken, requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, mobile, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "validation", message: "name, email, password, and role are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "conflict", message: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ name, email, mobile: mobile || null, passwordHash, role }).returning();
    const token = generateToken(user.id);
    const { passwordHash: _ph, ...safeUser } = user;
    res.status(201).json({ token, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "internal", message: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "validation", message: "email and password required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
      return;
    }
    const token = generateToken(user.id);
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "internal", message: "Login failed" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString() });
});

export default router;
