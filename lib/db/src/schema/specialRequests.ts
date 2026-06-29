import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const specialRequestsTable = pgTable(
  "special_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    requestType: text("request_type").notNull(), // "special_request" or "surprise"
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("pending"), // "pending", "approved", "completed", "declined"
    priority: text("priority").notNull().default("normal"), // "low", "normal", "high"
    price: text("price"), // Additional cost if applicable
    proofPhotos: jsonb("proof_photos").$type<string[]>(), // Photos for completed requests
    hostNotes: text("host_notes"), // Host's notes about the request
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookingIdIdx: index("special_requests_booking_id_idx").on(table.bookingId),
    guestIdIdx: index("special_requests_guest_id_idx").on(table.guestId),
    statusIdx: index("special_requests_status_idx").on(table.status),
  })
);

// Import needed tables
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";
