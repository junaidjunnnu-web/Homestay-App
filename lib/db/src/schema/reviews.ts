import { doublePrecision, pgTable, text, timestamp, uuid, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";
import { usersTable } from "./users";

export const reviewsTable = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").references(() => usersTable.id, { onDelete: "set null" }),
    guestName: text("guest_name"),
    // Overall rating (average of categories)
    rating: doublePrecision("rating").notNull(),
    // Category ratings (1-5)
    cleanlinessRating: doublePrecision("cleanliness_rating").notNull(),
    locationRating: doublePrecision("location_rating").notNull(),
    valueRating: doublePrecision("value_rating").notNull(),
    amenitiesRating: doublePrecision("amenities_rating").notNull(),
    hospitalityRating: doublePrecision("hospitality_rating").notNull(),
    comment: text("comment"),
    // Photo URLs
    photos: jsonb("photos").$type<string[]>(),
    // Host reply
    hostReply: text("host_reply"),
    hostReplyDate: timestamp("host_reply_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    propertyIdIdx: index("reviews_property_id_idx").on(table.propertyId),
    guestIdIdx: index("reviews_guest_id_idx").on(table.guestId),
    ratingIdx: index("reviews_rating_idx").on(table.rating),
  })
);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
