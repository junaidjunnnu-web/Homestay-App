import { doublePrecision, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";
import { usersTable } from "./users";

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id").references(() => usersTable.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  rating: doublePrecision("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
