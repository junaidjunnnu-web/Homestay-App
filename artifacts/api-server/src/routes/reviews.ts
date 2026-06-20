import { db } from "@workspace/db";
import { reviewsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";

const router = Router();

router.get("/properties/:propertyId/reviews", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.propertyId, propertyId)).orderBy(desc(reviewsTable.createdAt)).limit(50);
    res.json(reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "getPropertyReviews error");
    res.status(500).json({ error: "internal", message: "Failed to fetch reviews" });
  }
});

router.post("/properties/:propertyId/reviews", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { guestId, guestName, rating, comment } = req.body;
    if (!rating) {
      res.status(400).json({ error: "validation", message: "rating required" });
      return;
    }
    const [review] = await db.insert(reviewsTable).values({
      propertyId,
      guestId: guestId || null,
      guestName: guestName || "Anonymous",
      rating: Number(rating),
      comment: comment || null,
    }).returning();
    res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createReview error");
    res.status(500).json({ error: "internal", message: "Failed to create review" });
  }
});

export default router;
