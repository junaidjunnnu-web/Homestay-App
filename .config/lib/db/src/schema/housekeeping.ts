import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";
import { roomsTable } from "./rooms";

export const housekeepingTasksTable = pgTable("housekeeping_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").references(() => roomsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["cleaning", "maintenance", "other"] }).notNull().default("cleaning"),
  status: text("status", { enum: ["pending", "in_progress", "done"] }).notNull().default("pending"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHousekeepingTaskSchema = createInsertSchema(housekeepingTasksTable).omit({ id: true, createdAt: true });
export type InsertHousekeepingTask = z.infer<typeof insertHousekeepingTaskSchema>;
export type HousekeepingTask = typeof housekeepingTasksTable.$inferSelect;
