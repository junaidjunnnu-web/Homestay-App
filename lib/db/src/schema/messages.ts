import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookingIdIdx: index("messages_booking_id_idx").on(table.bookingId),
    senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
    receiverIdIdx: index("messages_receiver_id_idx").on(table.receiverId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// Import needed tables
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";
