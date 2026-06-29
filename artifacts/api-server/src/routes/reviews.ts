import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db";
import { desc, eq, and, avg } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function serializeReview(r: typeof reviewsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    hostReplyDate: r.hostReplyDate?.toISOString() || null,
  };
}

// GET reviews for a property
router.get("/properties/:propertyId/reviews", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.propertyId, propertyId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(50);

    // Enrich with guest info
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const guest = review.guestId
          ? (await db.select().from(usersTable).where(eq(usersTable.id, review.guestId)).limit(1))[0]
          : null;
        return {
          ...serializeReview(review),
          guest: guest ? { id: guest.id, name: guest.name, avatar: guest.avatar } : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getPropertyReviews error");
    res.status(500).json({ error: "internal", message: "Failed to fetch reviews" });
  }
});

// POST create review
router.post("/properties/:propertyId/reviews", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string; name: string } }).user;
  try {
    const { propertyId } = req.params;
    const {
      cleanlinessRating,
      locationRating,
      valueRating,
      amenitiesRating,
      hospitalityRating,
      comment,
      photos,
    } = req.body;

    // Validate category ratings (1-5)
    const ratings = [cleanlinessRating, locationRating, valueRating, amenitiesRating, hospitalityRating];
    for (const rating of ratings) {
      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({ error: "validation", message: "All category ratings must be between 1 and 5" });
        return;
      }
    }

    // Calculate overall rating as average
    const overallRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;

    const [review] = await db
      .insert(reviewsTable)
      .values({
        propertyId,
        guestId: user.id,
        guestName: user.name,
        rating: overallRating,
        cleanlinessRating,
        locationRating,
        valueRating,
        amenitiesRating,
        hospitalityRating,
        comment: comment || null,
        photos: photos || null,
      })
      .returning();

    res.status(201).json(serializeReview(review));
  } catch (err) {
    req.log.error({ err }, "createReview error");
    res.status(500).json({ error: "internal", message: "Failed to create review" });
  }
});

// PATCH host reply to review
router.patch("/reviews/:reviewId/reply", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId)).limit(1);
    if (!review) {
      res.status(404).json({ error: "not_found", message: "Review not found" });
      return;
    }

    // Verify user is the host of this property
    const { propertiesTable } = await import("@workspace/db");
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, review.propertyId))
      .limit(1);

    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only the host can reply" });
      return;
    }

    const [updated] = await db
      .update(reviewsTable)
      .set({
        hostReply: reply,
        hostReplyDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviewsTable.id, reviewId))
      .returning();

    res.json(serializeReview(updated));
  } catch (err) {
    req.log.error({ err }, "replyToReview error");
    res.status(500).json({ error: "internal", message: "Failed to reply to review" });
  }
});

// GET property rating summary
router.get("/properties/:propertyId/reviews/summary", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.propertyId, propertyId));

    if (reviews.length === 0) {
      res.json({
        averageRating: 0,
        totalReviews: 0,
        categoryAverages: {
          cleanliness: 0,
          location: 0,
          value: 0,
          amenities: 0,
          hospitality: 0,
        },
      });
      return;
    }

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const categoryAverages = {
      cleanliness: reviews.reduce((sum, r) => sum + r.cleanlinessRating, 0) / reviews.length,
      location: reviews.reduce((sum, r) => sum + r.locationRating, 0) / reviews.length,
      value: reviews.reduce((sum, r) => sum + r.valueRating, 0) / reviews.length,
      amenities: reviews.reduce((sum, r) => sum + r.amenitiesRating, 0) / reviews.length,
      hospitality: reviews.reduce((sum, r) => sum + r.hospitalityRating, 0) / reviews.length,
    };

    res.json({
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      categoryAverages: {
        cleanliness: Math.round(categoryAverages.cleanliness * 10) / 10,
        location: Math.round(categoryAverages.location * 10) / 10,
        value: Math.round(categoryAverages.value * 10) / 10,
        amenities: Math.round(categoryAverages.amenities * 10) / 10,
        hospitality: Math.round(categoryAverages.hospitality * 10) / 10,
      },
    });
  } catch (err) {
    req.log.error({ err }, "getPropertyReviewSummary error");
    res.status(500).json({ error: "internal", message: "Failed to fetch review summary" });
  }
});

export default router;
