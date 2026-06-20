import { db } from "@workspace/db";
import { menuItemsTable, propertiesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/menu", async (req, res) => {
  try {
    const { propertyId } = req.query as { propertyId?: string };
    if (!propertyId) {
      res.status(400).json({ error: "validation", message: "propertyId required" });
      return;
    }
    const items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.propertyId, propertyId)).orderBy(menuItemsTable.category, desc(menuItemsTable.createdAt));
    res.json(items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "getMenu error");
    res.status(500).json({ error: "internal", message: "Failed to fetch menu" });
  }
});

router.post("/menu", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId, name, description, category, price, isVeg } = req.body;
    if (!propertyId || !name || !category) {
      res.status(400).json({ error: "validation", message: "propertyId, name, category required" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.hostId, user.id))).limit(1);
    if (!property) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const [item] = await db.insert(menuItemsTable).values({ propertyId, name, description, category, price: price || 0, isVeg: isVeg !== false }).returning();
    res.status(201).json({ ...item!, createdAt: item!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createMenuItem error");
    res.status(500).json({ error: "internal", message: "Failed to create menu item" });
  }
});

router.put("/menu/:menuItemId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { menuItemId } = req.params;
    const [existing] = await db.select({ id: menuItemsTable.id, propertyId: menuItemsTable.propertyId }).from(menuItemsTable).where(eq(menuItemsTable.id, menuItemId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Menu item not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(and(eq(propertiesTable.id, existing.propertyId), eq(propertiesTable.hostId, user.id))).limit(1);
    if (!property) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const { name, description, category, price, isAvailable, isVeg } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = price;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (isVeg !== undefined) updates.isVeg = isVeg;
    const [updated] = await db.update(menuItemsTable).set(updates).where(eq(menuItemsTable.id, menuItemId)).returning();
    res.json({ ...updated!, createdAt: updated!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateMenuItem error");
    res.status(500).json({ error: "internal", message: "Failed to update menu item" });
  }
});

router.delete("/menu/:menuItemId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { menuItemId } = req.params;
    const [existing] = await db.select({ id: menuItemsTable.id, propertyId: menuItemsTable.propertyId }).from(menuItemsTable).where(eq(menuItemsTable.id, menuItemId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Menu item not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(and(eq(propertiesTable.id, existing.propertyId), eq(propertiesTable.hostId, user.id))).limit(1);
    if (!property) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, menuItemId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteMenuItem error");
    res.status(500).json({ error: "internal", message: "Failed to delete menu item" });
  }
});

export default router;
