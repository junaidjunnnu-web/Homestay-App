import { boolean, doublePrecision, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const propertiesTable = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  photos: text("photos").array().notNull().default([]),
  description: text("description"),
  amenities: text("amenities").array().notNull().default([]),
  mealsIncluded: boolean("meals_included").notNull().default(false),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  nearbyAttractions: text("nearby_attractions").array().notNull().default([]),
  upiId: text("upi_id"),
  bookingMode: text("booking_mode", { enum: ["inquiry", "instant"] }).notNull().default("inquiry"),
  cancellationPolicy: text("cancellation_policy"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
