import { db } from "@workspace/db";
import { bookingsTable, propertiesTable, roomsTable, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function genRef(): string {
  return "HMS" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function serializeBooking(b: typeof bookingsTable.$inferSelect) {
  return { ...b, createdAt: b.createdAt.toISOString() };
}

async function enrichBooking(booking: typeof bookingsTable.$inferSelect) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1);
  const property = room ? (await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1))[0] : null;
  const guest = booking.guestId ? (await db.select().from(usersTable).where(eq(usersTable.id, booking.guestId)).limit(1))[0] : null;
  return {
    ...serializeBooking(booking),
    room: room ? { ...room, createdAt: room.createdAt.toISOString() } : null,
    property: property ? { ...property, createdAt: property.createdAt.toISOString() } : null,
    guest: guest ? (() => { const { passwordHash: _ph, ...sg } = guest; return { ...sg, createdAt: sg.createdAt.toISOString() }; })() : null,
  };
}

// POST create booking (inquiry or instant)
router.post("/bookings", async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guestCount, guestName, guestEmail, guestMobile, specialRequests, guestId } = req.body;
    if (!roomId || !checkIn || !checkOut || !guestCount || !guestName || !guestEmail || !guestMobile) {
      res.status(400).json({ error: "validation", message: "roomId, checkIn, checkOut, guestCount, guestName, guestEmail, guestMobile required" });
      return;
    }

    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
    if (!room) {
      res.status(404).json({ error: "not_found", message: "Room not found" });
      return;
    }
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1);
    if (!property) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      res.status(400).json({ error: "validation", message: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }
    if (checkOutDate <= checkInDate) {
      res.status(400).json({ error: "validation", message: "Check-out must be after check-in." });
      return;
    }

    // Double booking prevention: check for overlapping confirmed/pending bookings
    const overlapping = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.roomId, roomId),
          sql`${bookingsTable.status} != 'cancelled'`,
          sql`${bookingsTable.checkIn}::date < ${checkOut}::date`,
          sql`${bookingsTable.checkOut}::date > ${checkIn}::date`
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      res.status(409).json({
        error: "double_booking",
        message: "This room is already booked for your selected dates. Please choose different dates.",
      });
      return;
    }

    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalAmount = nights * room.pricePerNight;

    // Auto-create guest account if no guestId provided
    let resolvedGuestId = guestId || null;
    if (!resolvedGuestId) {
      const existing = await db.select().from(usersTable).where(eq(usersTable.email, guestEmail)).limit(1);
      if (existing.length > 0) {
        resolvedGuestId = existing[0]!.id;
      } else {
        const tempPassword = Math.random().toString(36).slice(2, 10);
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const [newUser] = await db.insert(usersTable).values({ name: guestName, email: guestEmail, mobile: guestMobile, passwordHash, role: "guest" }).returning();
        resolvedGuestId = newUser.id;
      }
    }

    const status = property.bookingMode === "instant" ? "confirmed" : "pending";
    const paymentStatus = property.bookingMode === "instant" ? "paid" : "pending";

    const [booking] = await db.insert(bookingsTable).values({
      roomId,
      guestId: resolvedGuestId,
      checkIn,
      checkOut,
      guestCount: Number(guestCount),
      status,
      totalAmount,
      paymentStatus,
      specialRequests: specialRequests || null,
      referenceNumber: genRef(),
      guestName,
      guestEmail,
      guestMobile,
    }).returning();

    res.status(201).json(serializeBooking(booking));
  } catch (err) {
    req.log.error({ err }, "createBooking error");
    res.status(500).json({ error: "internal", message: "Failed to create booking" });
  }
});

// GET booking by reference (public)
router.get("/bookings/status/:referenceNumber", async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.referenceNumber, referenceNumber)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }
    res.json(await enrichBooking(booking));
  } catch (err) {
    req.log.error({ err }, "getBookingByReference error");
    res.status(500).json({ error: "internal", message: "Failed to fetch booking" });
  }
});

// GET guest bookings
router.get("/bookings/guest", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.guestId, user.id)).orderBy(desc(bookingsTable.createdAt));
    const enriched = await Promise.all(bookings.map(enrichBooking));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getGuestBookings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch bookings" });
  }
});

// GET host bookings
router.get("/bookings/host", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { status: statusFilter, propertyId: propFilter } = req.query as { status?: string; propertyId?: string };

    const hostProps = await db.select({ id: propertiesTable.id }).from(propertiesTable).where(eq(propertiesTable.hostId, user.id));
    const propIds = hostProps.map(p => p.id);

    if (propIds.length === 0) {
      res.json([]);
      return;
    }

    let filteredPropIds = propIds;
    if (propFilter) filteredPropIds = propIds.filter(id => id === propFilter);

    const rooms = await db.select({ id: roomsTable.id }).from(roomsTable).where(sql`${roomsTable.propertyId} = ANY(ARRAY[${sql.raw(filteredPropIds.map(id => `'${id}'`).join(","))}]::uuid[])`);
    const roomIds = rooms.map(r => r.id);

    if (roomIds.length === 0) {
      res.json([]);
      return;
    }

    const conditions = [sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIds.map(id => `'${id}'`).join(","))}]::uuid[])`];
    if (statusFilter) conditions.push(eq(bookingsTable.status, statusFilter as "pending" | "confirmed" | "cancelled" | "completed"));

    const bookings = await db.select().from(bookingsTable).where(and(...conditions)).orderBy(desc(bookingsTable.createdAt));
    const enriched = await Promise.all(bookings.map(enrichBooking));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getHostBookings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch host bookings" });
  }
});

// GET single booking
router.get("/bookings/:bookingId", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }
    res.json(await enrichBooking(booking));
  } catch (err) {
    req.log.error({ err }, "getBooking error");
    res.status(500).json({ error: "internal", message: "Failed to fetch booking" });
  }
});

// PATCH update booking status (host approve/decline)
router.patch("/bookings/:bookingId/status", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1);
    const [property] = room ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1) : [null];
    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your booking" });
      return;
    }
    const paymentStatus = status === "confirmed" ? "paid" : booking.paymentStatus;
    const [updated] = await db.update(bookingsTable).set({ status, paymentStatus }).where(eq(bookingsTable.id, bookingId)).returning();
    res.json(serializeBooking(updated));
  } catch (err) {
    req.log.error({ err }, "updateBookingStatus error");
    res.status(500).json({ error: "internal", message: "Failed to update booking status" });
  }
});

export default router;
