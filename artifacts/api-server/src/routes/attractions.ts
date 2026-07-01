import { db } from "@workspace/db";
import { attractionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { fetchGoogleNearbyPlaces, geocodeLocation } from "../services/googlePlaces";

const router = Router();

function serializeAttraction(a: typeof attractionsTable.$inferSelect) {
  return { ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() };
}

// GET attractions for a property
router.get("/properties/:propertyId/attractions", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { category } = req.query as { category?: string };

    let conditions = [eq(attractionsTable.propertyId, propertyId)];
    if (category) {
      conditions.push(eq(attractionsTable.category, category as any));
    }

    const attractions = await db
      .select()
      .from(attractionsTable)
      .where(and(...conditions))
      .orderBy(desc(attractionsTable.rating));

    res.json(attractions.map(serializeAttraction));
  } catch (err) {
    req.log.error({ err }, "getPropertyAttractions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch attractions" });
  }
});

// POST create attraction (for hosts)
router.post("/properties/:propertyId/attractions", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { propertyId } = req.params;
    const {
      name,
      category,
      description,
      address,
      latitude,
      longitude,
      distance,
      estimatedTime,
      rating,
      photos,
      openingHours,
      entryFee,
      contact,
      website,
      tips,
    } = req.body;

    if (!name || !category) {
      res.status(400).json({ error: "validation", message: "name and category required" });
      return;
    }

    // Verify user is the host of this property
    const { propertiesTable } = await import("@workspace/db");
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);

    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only the host can add attractions" });
      return;
    }

    const [attraction] = await db
      .insert(attractionsTable)
      .values({
        propertyId,
        name,
        category,
        description: description || null,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        distance: distance || null,
        estimatedTime: estimatedTime || null,
        rating: rating || null,
        photos: photos || null,
        openingHours: openingHours || null,
        entryFee: entryFee || null,
        contact: contact || null,
        website: website || null,
        tips: tips || null,
      })
      .returning();

    res.status(201).json(serializeAttraction(attraction));
  } catch (err) {
    req.log.error({ err }, "createAttraction error");
    res.status(500).json({ error: "internal", message: "Failed to create attraction" });
  }
});

// PATCH update attraction
router.patch("/attractions/:attractionId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { attractionId } = req.params;
    const updates = req.body;

    const [attraction] = await db.select().from(attractionsTable).where(eq(attractionsTable.id, attractionId)).limit(1);
    if (!attraction) {
      res.status(404).json({ error: "not_found", message: "Attraction not found" });
      return;
    }

    // Verify user is the host of this property
    const { propertiesTable } = await import("@workspace/db");
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, attraction.propertyId)).limit(1);

    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only the host can update attractions" });
      return;
    }

    const [updated] = await db
      .update(attractionsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(attractionsTable.id, attractionId))
      .returning();

    res.json(serializeAttraction(updated));
  } catch (err) {
    req.log.error({ err }, "updateAttraction error");
    res.status(500).json({ error: "internal", message: "Failed to update attraction" });
  }
});

// DELETE attraction
router.delete("/attractions/:attractionId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { attractionId } = req.params;

    const [attraction] = await db.select().from(attractionsTable).where(eq(attractionsTable.id, attractionId)).limit(1);
    if (!attraction) {
      res.status(404).json({ error: "not_found", message: "Attraction not found" });
      return;
    }

    // Verify user is the host of this property
    const { propertiesTable } = await import("@workspace/db");
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, attraction.propertyId)).limit(1);

    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only the host can delete attractions" });
      return;
    }

    await db.delete(attractionsTable).where(eq(attractionsTable.id, attractionId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteAttraction error");
    res.status(500).json({ error: "internal", message: "Failed to delete attraction" });
  }
});

// GET nearby places (Google Maps + host-curated attractions)
router.get("/properties/:propertyId/nearby-places", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { category } = req.query as { category?: string };

    const { propertiesTable } = await import("@workspace/db");
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!property) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }

    let conditions = [eq(attractionsTable.propertyId, propertyId)];
    if (category && category !== "all") {
      conditions.push(eq(attractionsTable.category, category as any));
    }
    const dbAttractions = await db
      .select()
      .from(attractionsTable)
      .where(and(...conditions))
      .orderBy(desc(attractionsTable.rating));

    const curated = dbAttractions.map((a) => ({
      ...serializeAttraction(a),
      source: "database" as const,
    }));

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    let googlePlaces: Awaited<ReturnType<typeof fetchGoogleNearbyPlaces>> = [];

    if (apiKey) {
      let lat = property.locationLat;
      let lng = property.locationLng;
      if (lat == null || lng == null) {
        const geoQuery = `${property.address}, ${property.city}, ${property.state}`;
        const geo = await geocodeLocation(geoQuery, apiKey);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }
      if (lat != null && lng != null) {
        googlePlaces = await fetchGoogleNearbyPlaces(lat, lng, apiKey, category);
      }
    }

    const curatedNames = new Set(curated.map((a) => a.name.toLowerCase()));
    const mergedGoogle = googlePlaces
      .filter((p) => !curatedNames.has(p.name.toLowerCase()))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        distance: p.distance,
        rating: p.rating,
        source: p.source,
      }));

    const combined = [...curated, ...mergedGoogle];
    res.json(combined);
  } catch (err) {
    req.log.error({ err }, "getNearbyPlaces error");
    res.status(500).json({ error: "internal", message: "Failed to fetch nearby places" });
  }
});

export default router;
