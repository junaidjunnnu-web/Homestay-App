import { date, doublePrecision, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id").references(() => usersTable.id, { onDelete: "set null" }),
  checkIn: date("check_in", { mode: "string" }).notNull(),
  checkOut: date("check_out", { mode: "string" }).notNull(),
  guestCount: integer("guest_count").notNull().default(1),
  status: text("status", { enum: ["pending", "confirmed", "cancelled", "completed"] }).notNull().default("pending"),
  totalAmount: doublePrecision("total_amount").notNull(),
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "refunded"] }).notNull().default("pending"),
  specialRequests: text("special_requests"),
  referenceNumber: text("reference_number").notNull().unique(),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestMobile: text("guest_mobile").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
