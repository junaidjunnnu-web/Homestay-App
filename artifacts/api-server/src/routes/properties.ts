import { db } from "@workspace/db";
import { bookingsTable, propertiesTable, reviewsTable, roomsTable, usersTable } from "@workspace/db";
import { and, avg, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Router } from "express";
import { requireAuth, requireHost } from "../middlewares/auth";

const router = Router();

function serializeProperty(p: typeof propertiesTable.$inferSelect & { averageRating?: number | null; reviewCount?: number | null; minPrice?: number | null }) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    averageRating: p.averageRating ?? null,
    reviewCount: p.reviewCount ?? null,
    minPrice: p.minPrice ?? null,
  };
}

// GET all active properties (guest browse - NO user filtering)
router.get("/properties", async (req, res) => {
  try {
    const { city, state, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(propertiesTable.status, "active")];
    if (city) conditions.push(sql`lower(${propertiesTable.city}) like lower(${"%" + city + "%"})`);
    if (state) conditions.push(sql`lower(${propertiesTable.state}) like lower(${"%" + state + "%"})`);

    const props = await db
      .select({
        id: propertiesTable.id,
        hostId: propertiesTable.hostId,
        name: propertiesTable.name,
        address: propertiesTable.address,
        city: propertiesTable.city,
        state: propertiesTable.state,
        photos: propertiesTable.photos,
        description: propertiesTable.description,
        amenities: propertiesTable.amenities,
        mealsIncluded: propertiesTable.mealsIncluded,
        locationLat: propertiesTable.locationLat,
        locationLng: propertiesTable.locationLng,
        nearbyAttractions: propertiesTable.nearbyAttractions,
        upiId: propertiesTable.upiId,
        bookingMode: propertiesTable.bookingMode,
        cancellationPolicy: propertiesTable.cancellationPolicy,
        status: propertiesTable.status,
        createdAt: propertiesTable.createdAt,
        averageRating: avg(reviewsTable.rating),
        reviewCount: count(reviewsTable.id),
        minPrice: sql<number>`min(${roomsTable.pricePerNight})`,
      })
      .from(propertiesTable)
      .leftJoin(reviewsTable, eq(reviewsTable.propertyId, propertiesTable.id))
      .leftJoin(roomsTable, and(eq(roomsTable.propertyId, propertiesTable.id), eq(roomsTable.status, "available")))
      .where(and(...conditions))
      .groupBy(propertiesTable.id)
      .orderBy(desc(propertiesTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(propertiesTable.id) })
      .from(propertiesTable)
      .where(and(...conditions));

    res.json({
      properties: props.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
      total: Number(total),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "getProperties error");
    res.status(500).json({ error: "internal", message: "Failed to fetch properties" });
  }
});

// GET host's own properties (authenticated)
router.get("/properties/host", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const props = await db
      .select({
        id: propertiesTable.id,
        hostId: propertiesTable.hostId,
        name: propertiesTable.name,
        address: propertiesTable.address,
        city: propertiesTable.city,
        state: propertiesTable.state,
        photos: propertiesTable.photos,
        description: propertiesTable.description,
        amenities: propertiesTable.amenities,
        mealsIncluded: propertiesTable.mealsIncluded,
        locationLat: propertiesTable.locationLat,
        locationLng: propertiesTable.locationLng,
        nearbyAttractions: propertiesTable.nearbyAttractions,
        upiId: propertiesTable.upiId,
        bookingMode: propertiesTable.bookingMode,
        cancellationPolicy: propertiesTable.cancellationPolicy,
        status: propertiesTable.status,
        createdAt: propertiesTable.createdAt,
        averageRating: avg(reviewsTable.rating),
        reviewCount: count(reviewsTable.id),
        minPrice: sql<number>`min(${roomsTable.pricePerNight})`,
      })
      .from(propertiesTable)
      .leftJoin(reviewsTable, eq(reviewsTable.propertyId, propertiesTable.id))
      .leftJoin(roomsTable, eq(roomsTable.propertyId, propertiesTable.id))
      .where(eq(propertiesTable.hostId, user.id))
      .groupBy(propertiesTable.id)
      .orderBy(desc(propertiesTable.createdAt));

    res.json(props.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "getHostProperties error");
    res.status(500).json({ error: "internal", message: "Failed to fetch host properties" });
  }
});

// GET single property detail
router.get("/properties/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!property) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.propertyId, propertyId));
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.propertyId, propertyId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(20);
    const [host] = await db.select().from(usersTable).where(eq(usersTable.id, property.hostId)).limit(1);
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

    const { passwordHash: _ph, ...safeHost } = host;
    res.json({
      ...property,
      createdAt: property.createdAt.toISOString(),
      averageRating: avgRating,
      reviewCount: reviews.length,
      minPrice: rooms.length > 0 ? Math.min(...rooms.map(r => r.pricePerNight)) : null,
      rooms: rooms.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
      reviews: reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
      host: { ...safeHost, createdAt: safeHost.createdAt.toISOString() },
    });
  } catch (err) {
    req.log.error({ err }, "getProperty error");
    res.status(500).json({ error: "internal", message: "Failed to fetch property" });
  }
});

// POST create property
router.post("/properties", requireHost, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { name, address, city, state, bookingMode, photos, description, amenities, mealsIncluded, locationLat, locationLng, nearbyAttractions, upiId, cancellationPolicy } = req.body;
    if (!name || !address || !city || !state || !bookingMode) {
      res.status(400).json({ error: "validation", message: "name, address, city, state, bookingMode required" });
      return;
    }
    const [property] = await db.insert(propertiesTable).values({
      hostId: user.id,
      name,
      address,
      city,
      state,
      bookingMode,
      photos: photos || [],
      description: description || null,
      amenities: amenities || [],
      mealsIncluded: mealsIncluded ?? false,
      locationLat: locationLat || null,
      locationLng: locationLng || null,
      nearbyAttractions: nearbyAttractions || [],
      upiId: upiId || null,
      cancellationPolicy: cancellationPolicy || null,
    }).returning();
    res.status(201).json({ ...property, createdAt: property.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createProperty error");
    res.status(500).json({ error: "internal", message: "Failed to create property" });
  }
});

// PUT update property
router.put("/properties/:propertyId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId } = req.params;
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }
    if (existing.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    const updates: Partial<typeof propertiesTable.$inferInsert> = {};
    const fields = ["name", "address", "city", "state", "bookingMode", "photos", "description", "amenities", "mealsIncluded", "locationLat", "locationLng", "nearbyAttractions", "upiId", "cancellationPolicy", "status"] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (updates as Record<string, unknown>)[f] = req.body[f];
    }
    const [updated] = await db.update(propertiesTable).set(updates).where(eq(propertiesTable.id, propertyId)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateProperty error");
    res.status(500).json({ error: "internal", message: "Failed to update property" });
  }
});

// DELETE property
router.delete("/properties/:propertyId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId } = req.params;
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }
    if (existing.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your property" });
      return;
    }
    await db.delete(propertiesTable).where(eq(propertiesTable.id, propertyId));
    res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    req.log.error({ err }, "deleteProperty error");
    res.status(500).json({ error: "internal", message: "Failed to delete property" });
  }
});

// GET host dashboard
router.get("/host/dashboard", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const today = new Date().toISOString().split("T")[0]!;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]!;

    const hostProps = await db.select({ id: propertiesTable.id }).from(propertiesTable).where(eq(propertiesTable.hostId, user.id));
    const propIds = hostProps.map(p => p.id);

    if (propIds.length === 0) {
      res.json({ totalProperties: 0, totalRooms: 0, occupancyPercent: 0, revenueThisMonth: 0, todayCheckIns: 0, todayCheckOuts: 0, pendingBookings: 0, recentBookings: [] });
      return;
    }

    const rooms = await db.select().from(roomsTable).where(sql`${roomsTable.propertyId} = ANY(ARRAY[${sql.raw(propIds.map(id => `'${id}'`).join(","))}]::uuid[])`);
    const roomIds = rooms.map(r => r.id);

    let todayCheckIns = 0, todayCheckOuts = 0, pendingBookings = 0, revenueThisMonth = 0;
    let recentBookings: unknown[] = [];

    if (roomIds.length > 0) {
      const allBookings = await db
        .select()
        .from(bookingsTable)
        .where(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIds.map(id => `'${id}'`).join(","))}]::uuid[])`)
        .orderBy(desc(bookingsTable.createdAt));

      todayCheckIns = allBookings.filter(b => b.checkIn === today && (b.status === "confirmed" || b.status === "completed")).length;
      todayCheckOuts = allBookings.filter(b => b.checkOut === today && (b.status === "confirmed" || b.status === "completed")).length;
      pendingBookings = allBookings.filter(b => b.status === "pending").length;
      revenueThisMonth = allBookings
        .filter(b => b.createdAt.toISOString().split("T")[0]! >= startOfMonth && b.paymentStatus === "paid")
        .reduce((sum, b) => sum + b.totalAmount, 0);

      const confirmedNow = allBookings.filter(b => b.status === "confirmed" && b.checkIn <= today && b.checkOut > today);
      const occupancyPercent = rooms.length > 0 ? Math.round((confirmedNow.length / rooms.length) * 100) : 0;

      recentBookings = allBookings.slice(0, 10).map(b => {
        const room = rooms.find(r => r.id === b.roomId);
        const property = hostProps.find(p => room && p.id === room.propertyId);
        return {
          ...b,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          createdAt: b.createdAt.toISOString(),
          room: room ? { ...room, createdAt: room.createdAt.toISOString() } : null,
          property: property ? { ...property } : null,
        };
      });

      const confirmedAllTime = allBookings.filter(b => b.status === "confirmed" && b.checkIn <= today && b.checkOut > today).length;
      res.json({
        totalProperties: propIds.length,
        totalRooms: rooms.length,
        occupancyPercent: rooms.length > 0 ? Math.round((confirmedAllTime / rooms.length) * 100) : 0,
        revenueThisMonth,
        todayCheckIns,
        todayCheckOuts,
        pendingBookings,
        recentBookings,
      });
      return;
    }

    res.json({ totalProperties: propIds.length, totalRooms: 0, occupancyPercent: 0, revenueThisMonth: 0, todayCheckIns: 0, todayCheckOuts: 0, pendingBookings: 0, recentBookings: [] });
  } catch (err) {
    req.log.error({ err }, "dashboard error");
    res.status(500).json({ error: "internal", message: "Failed to fetch dashboard" });
  }
});

export default router;
