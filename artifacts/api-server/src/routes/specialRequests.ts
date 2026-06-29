import { db } from "@workspace/db";
import { specialRequestsTable, bookingsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function serializeRequest(r: typeof specialRequestsTable.$inferSelect) {
  return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

// GET special requests for a booking
router.get("/bookings/:bookingId/special-requests", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId } = req.params;
    
    // Verify user has access to this booking
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    // Check if user is guest or host
    const isGuest = booking.guestId === user.id;
    if (!isGuest) {
      // Check if user is host
      const { roomsTable, propertiesTable } = await import("@workspace/db");
      const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1);
      if (!room) {
        res.status(403).json({ error: "forbidden", message: "Access denied" });
        return;
      }
      const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1);
      if (!property || property.hostId !== user.id) {
        res.status(403).json({ error: "forbidden", message: "Access denied" });
        return;
      }
    }

    const requests = await db
      .select()
      .from(specialRequestsTable)
      .where(eq(specialRequestsTable.bookingId, bookingId))
      .orderBy(desc(specialRequestsTable.createdAt));

    // Enrich with guest info
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const [guest] = await db.select().from(usersTable).where(eq(usersTable.id, request.guestId)).limit(1);
        return {
          ...serializeRequest(request),
          guest: guest ? { id: guest.id, name: guest.name, avatar: guest.avatar } : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getSpecialRequests error");
    res.status(500).json({ error: "internal", message: "Failed to fetch special requests" });
  }
});

// POST create special request
router.post("/bookings/:bookingId/special-requests", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId } = req.params;
    const { requestType, title, description, priority, price } = req.body;

    if (!requestType || !title || !description) {
      res.status(400).json({ error: "validation", message: "requestType, title, description required" });
      return;
    }

    if (!["special_request", "surprise"].includes(requestType)) {
      res.status(400).json({ error: "validation", message: "requestType must be 'special_request' or 'surprise'" });
      return;
    }

    // Verify booking exists and user is the guest
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    if (booking.guestId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only guests can create special requests" });
      return;
    }

    const [request] = await db
      .insert(specialRequestsTable)
      .values({
        bookingId,
        guestId: user.id,
        requestType,
        title,
        description,
        priority: priority || "normal",
        price: price || null,
        status: "pending",
      })
      .returning();

    res.status(201).json(serializeRequest(request));
  } catch (err) {
    req.log.error({ err }, "createSpecialRequest error");
    res.status(500).json({ error: "internal", message: "Failed to create special request" });
  }
});

// PATCH update special request status (for host)
router.patch("/special-requests/:requestId/status", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { requestId } = req.params;
    const { status, hostNotes, proofPhotos } = req.body;

    const [request] = await db.select().from(specialRequestsTable).where(eq(specialRequestsTable.id, requestId)).limit(1);
    if (!request) {
      res.status(404).json({ error: "not_found", message: "Request not found" });
      return;
    }

    // Verify user is the host of this booking
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, request.bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    const { roomsTable, propertiesTable } = await import("@workspace/db");
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1);
    const [property] = room ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1) : [null];

    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only the host can update request status" });
      return;
    }

    const [updated] = await db
      .update(specialRequestsTable)
      .set({
        status,
        hostNotes: hostNotes || request.hostNotes,
        proofPhotos: proofPhotos || request.proofPhotos,
        updatedAt: new Date(),
      })
      .where(eq(specialRequestsTable.id, requestId))
      .returning();

    res.json(serializeRequest(updated));
  } catch (err) {
    req.log.error({ err }, "updateSpecialRequestStatus error");
    res.status(500).json({ error: "internal", message: "Failed to update request status" });
  }
});

// GET all special requests for host's properties
router.get("/host/special-requests", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { status } = req.query as { status?: string };

    // Get all properties for this host
    const { propertiesTable, roomsTable } = await import("@workspace/db");
    const hostProps = await db.select({ id: propertiesTable.id }).from(propertiesTable).where(eq(propertiesTable.hostId, user.id));
    const propIds = hostProps.map((p) => p.id);

    if (propIds.length === 0) {
      res.json([]);
      return;
    }

    // Get all rooms for these properties
    const rooms = await db
      .select({ id: roomsTable.id })
      .from(roomsTable)
      .where(sql`${roomsTable.propertyId} = ANY(ARRAY[${sql.raw(propIds.map((id) => `'${id}'`).join(","))}]::uuid[])`);
    const roomIds = rooms.map((r) => r.id);

    // Get all bookings for these rooms
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIds.map((id) => `'${id}'`).join(","))}]::uuid[])`);

    const bookingIds = bookings.map((b) => b.id);

    // Get all special requests for these bookings
    let conditions = [sql`${specialRequestsTable.bookingId} = ANY(ARRAY[${sql.raw(bookingIds.map((id) => `'${id}'`).join(","))}]::uuid[])`];
    if (status) {
      conditions.push(eq(specialRequestsTable.status, status as any));
    }

    const requests = await db
      .select()
      .from(specialRequestsTable)
      .where(and(...conditions))
      .orderBy(desc(specialRequestsTable.createdAt));

    // Enrich with booking and guest info
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const [booking] = bookings.filter((b) => b.id === request.bookingId);
        const [guest] = request.guestId ? (await db.select().from(usersTable).where(eq(usersTable.id, request.guestId)).limit(1))[0] : null;
        return {
          ...serializeRequest(request),
          booking: booking ? { id: booking.id, referenceNumber: booking.referenceNumber, checkIn: booking.checkIn, checkOut: booking.checkOut } : null,
          guest: guest ? { id: guest.id, name: guest.name, avatar: guest.avatar } : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getHostSpecialRequests error");
    res.status(500).json({ error: "internal", message: "Failed to fetch special requests" });
  }
});

import { sql } from "drizzle-orm";

export default router;
