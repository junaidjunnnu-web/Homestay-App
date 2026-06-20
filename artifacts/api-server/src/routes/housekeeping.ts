import { db } from "@workspace/db";
import { housekeepingTasksTable, propertiesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/housekeeping", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId, status } = req.query as { propertyId?: string; status?: string };

    const hostProps = await db.select({ id: propertiesTable.id }).from(propertiesTable).where(eq(propertiesTable.hostId, user.id));
    const propIds = hostProps.map(p => p.id);
    if (propIds.length === 0) {
      res.json([]);
      return;
    }

    const conditions = [];
    if (propertyId) {
      if (!propIds.includes(propertyId)) {
        res.status(403).json({ error: "forbidden", message: "Not your property" });
        return;
      }
      conditions.push(eq(housekeepingTasksTable.propertyId, propertyId));
    } else {
      conditions.push(eq(housekeepingTasksTable.propertyId, propIds[0]!));
      // For multiple properties, we'd need OR logic - simplified for now
    }
    if (status) conditions.push(eq(housekeepingTasksTable.status, status as "pending" | "in_progress" | "done"));

    const tasks = await db.select().from(housekeepingTasksTable).where(and(...conditions)).orderBy(desc(housekeepingTasksTable.createdAt));
    res.json(tasks.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "getHousekeepingTasks error");
    res.status(500).json({ error: "internal", message: "Failed to fetch tasks" });
  }
});

router.post("/housekeeping", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId, roomId, title, description, type, priority, dueDate } = req.body;
    if (!propertyId || !title || !type || !priority) {
      res.status(400).json({ error: "validation", message: "propertyId, title, type, priority required" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const [task] = await db.insert(housekeepingTasksTable).values({ propertyId, roomId: roomId || null, title, description: description || null, type, priority, dueDate: dueDate || null }).returning();
    res.status(201).json({ ...task, createdAt: task.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createHousekeepingTask error");
    res.status(500).json({ error: "internal", message: "Failed to create task" });
  }
});

router.patch("/housekeeping/:taskId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { taskId } = req.params;
    const [task] = await db.select().from(housekeepingTasksTable).where(eq(housekeepingTasksTable.id, taskId)).limit(1);
    if (!task) {
      res.status(404).json({ error: "not_found", message: "Task not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, task.propertyId)).limit(1);
    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your task" });
      return;
    }
    const updates: Partial<typeof housekeepingTasksTable.$inferInsert> = {};
    for (const f of ["title", "description", "status", "priority", "dueDate"] as const) {
      if (req.body[f] !== undefined) (updates as Record<string, unknown>)[f] = req.body[f];
    }
    const [updated] = await db.update(housekeepingTasksTable).set(updates).where(eq(housekeepingTasksTable.id, taskId)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateHousekeepingTask error");
    res.status(500).json({ error: "internal", message: "Failed to update task" });
  }
});

router.delete("/housekeeping/:taskId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { taskId } = req.params;
    const [task] = await db.select().from(housekeepingTasksTable).where(eq(housekeepingTasksTable.id, taskId)).limit(1);
    if (!task) {
      res.status(404).json({ error: "not_found", message: "Task not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, task.propertyId)).limit(1);
    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your task" });
      return;
    }
    await db.delete(housekeepingTasksTable).where(eq(housekeepingTasksTable.id, taskId));
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    req.log.error({ err }, "deleteHousekeepingTask error");
    res.status(500).json({ error: "internal", message: "Failed to delete task" });
  }
});

export default router;
