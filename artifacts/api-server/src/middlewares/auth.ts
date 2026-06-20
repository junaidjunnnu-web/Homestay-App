import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["SESSION_SECRET"] || "homestay-secret-key";

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
  }
}

export async function requireHost(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as Request & { user: { role: string } }).user;
    if (user.role !== "host") {
      res.status(403).json({ error: "Forbidden", message: "Host access required" });
      return;
    }
    next();
  });
}
