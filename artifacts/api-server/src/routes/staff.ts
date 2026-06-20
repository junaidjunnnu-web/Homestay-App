import { db } from "@workspace/db";
import { staffTable, propertiesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/staff", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string; role: string } }).user;
  try {
    const { propertyId } = req.query as { propertyId?: string };
    const conditions = [eq(staffTable.hostId, user.id)];
    if (propertyId) conditions.push(eq(staffTable.propertyId, propertyId));
    const staff = await db.select().from(staffTable).where(and(...conditions)).orderBy(desc(staffTable.createdAt));
    res.json(staff.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "getStaff error");
    res.status(500).json({ error: "internal", message: "Failed to fetch staff" });
  }
});

router.post("/staff", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId, name, mobile, role, notes } = req.body;
    if (!propertyId || !name || !role) {
      res.status(400).json({ error: "validation", message: "propertyId, name, role required" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.hostId, user.id))).limit(1);
    if (!property) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const [member] = await db.insert(staffTable).values({ propertyId, hostId: user.id, name, mobile, role, notes }).returning();
    res.status(201).json({ ...member!, createdAt: member!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createStaff error");
    res.status(500).json({ error: "internal", message: "Failed to create staff member" });
  }
});

router.put("/staff/:staffId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { staffId } = req.params;
    const { name, mobile, role, status, notes } = req.body;
    const [existing] = await db.select().from(staffTable).where(and(eq(staffTable.id, staffId), eq(staffTable.hostId, user.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Staff member not found" });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (mobile !== undefined) updates.mobile = mobile;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    const [updated] = await db.update(staffTable).set(updates).where(eq(staffTable.id, staffId)).returning();
    res.json({ ...updated!, createdAt: updated!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateStaff error");
    res.status(500).json({ error: "internal", message: "Failed to update staff member" });
  }
});

router.delete("/staff/:staffId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { staffId } = req.params;
    const [existing] = await db.select().from(staffTable).where(and(eq(staffTable.id, staffId), eq(staffTable.hostId, user.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Staff member not found" });
      return;
    }
    await db.delete(staffTable).where(eq(staffTable.id, staffId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteStaff error");
    res.status(500).json({ error: "internal", message: "Failed to delete staff member" });
  }
});

export default router;
