import { db } from "@workspace/db";
import { bookingsTable, propertiesTable, roomsTable } from "@workspace/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET rooms for a property
router.get("/properties/:propertyId/rooms", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.propertyId, propertyId));
    res.json(rooms.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "getRooms error");
    res.status(500).json({ error: "internal", message: "Failed to fetch rooms" });
  }
});

// POST create room
router.post("/properties/:propertyId/rooms", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId } = req.params;
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!property) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }
    if (property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const { name, type, pricePerNight, capacity, photos } = req.body;
    if (!name || !type || pricePerNight === undefined || !capacity) {
      res.status(400).json({ error: "validation", message: "name, type, pricePerNight, capacity required" });
      return;
    }
    const [room] = await db.insert(roomsTable).values({
      propertyId,
      name,
      type,
      pricePerNight: Number(pricePerNight),
      capacity: Number(capacity),
      photos: photos || [],
    }).returning();
    res.status(201).json({ ...room, createdAt: room.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createRoom error");
    res.status(500).json({ error: "internal", message: "Failed to create room" });
  }
});

// GET single room
router.get("/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
    if (!room) {
      res.status(404).json({ error: "not_found", message: "Room not found" });
      return;
    }
    res.json({ ...room, createdAt: room.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "getRoom error");
    res.status(500).json({ error: "internal", message: "Failed to fetch room" });
  }
});

// PUT update room
router.put("/rooms/:roomId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { roomId } = req.params;
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
    if (!room) {
      res.status(404).json({ error: "not_found", message: "Room not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1);
    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const updates: Partial<typeof roomsTable.$inferInsert> = {};
    const fields = ["name", "type", "pricePerNight", "capacity", "photos", "status"] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (updates as Record<string, unknown>)[f] = req.body[f];
    }
    const [updated] = await db.update(roomsTable).set(updates).where(eq(roomsTable.id, roomId)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateRoom error");
    res.status(500).json({ error: "internal", message: "Failed to update room" });
  }
});

// DELETE room
router.delete("/rooms/:roomId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { roomId } = req.params;
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
    if (!room) {
      res.status(404).json({ error: "not_found", message: "Room not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1);
    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    await db.delete(roomsTable).where(eq(roomsTable.id, roomId));
    res.json({ success: true, message: "Room deleted" });
  } catch (err) {
    req.log.error({ err }, "deleteRoom error");
    res.status(500).json({ error: "internal", message: "Failed to delete room" });
  }
});

// GET room availability
router.get("/rooms/:roomId/availability", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { month } = req.query as { month?: string };
    let startDate: string, endDate: string;
    if (month) {
      const [year, m] = month.split("-");
      startDate = `${year}-${m}-01`;
      const endD = new Date(parseInt(year!), parseInt(m!), 0);
      endDate = endD.toISOString().split("T")[0]!;
    } else {
      const now = new Date();
      startDate = now.toISOString().split("T")[0]!;
      const future = new Date(now);
      future.setMonth(future.getMonth() + 3);
      endDate = future.toISOString().split("T")[0]!;
    }

    const bookings = await db
      .select({ checkIn: bookingsTable.checkIn, checkOut: bookingsTable.checkOut })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.roomId, roomId),
          or(
            eq(bookingsTable.status, "confirmed"),
            eq(bookingsTable.status, "pending"),
          ),
          gte(bookingsTable.checkOut, startDate),
          lte(bookingsTable.checkIn, endDate),
        )
      );

    // Generate all booked dates
    const bookedDates: string[] = [];
    for (const booking of bookings) {
      const start = new Date(booking.checkIn);
      const end = new Date(booking.checkOut);
      const curr = new Date(start);
      while (curr < end) {
        bookedDates.push(curr.toISOString().split("T")[0]!);
        curr.setDate(curr.getDate() + 1);
      }
    }

    res.json({ roomId, bookedDates: [...new Set(bookedDates)] });
  } catch (err) {
    req.log.error({ err }, "getRoomAvailability error");
    res.status(500).json({ error: "internal", message: "Failed to fetch availability" });
  }
});

export default router;
