import { integer, pgTable, text, timestamp, uuid, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";

export const roomsTable = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  pricePerNight: doublePrecision("price_per_night").notNull(),
  capacity: integer("capacity").notNull().default(2),
  photos: text("photos").array().notNull().default([]),
  status: text("status", { enum: ["available", "occupied", "maintenance"] }).notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
