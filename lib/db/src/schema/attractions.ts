import { pgTable, uuid, text, timestamp, doublePrecision, jsonb, index } from "drizzle-orm/pg-core";

export const attractionsTable = pgTable(
  "attractions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(), // "restaurant", "tourist_spot", "temple", "beach", "park", "shopping", "adventure", "cultural"
    description: text("description"),
    address: text("address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    distance: doublePrecision("distance"), // Distance from property in km
    estimatedTime: text("estimated_time"), // e.g., "15 min drive", "30 min walk"
    rating: doublePrecision("rating"), // Average rating
    photos: jsonb("photos").$type<string[]>(),
    openingHours: text("opening_hours"), // e.g., "9 AM - 6 PM"
    entryFee: text("entry_fee"), // e.g., "₹100", "Free"
    contact: text("contact"),
    website: text("website"),
    tips: text("tips"), // Host's tips for visitors
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdIdx: index("attractions_property_id_idx").on(table.propertyId),
    categoryIdx: index("attractions_category_idx").on(table.category),
    ratingIdx: index("attractions_rating_idx").on(table.rating),
  })
);

// Import needed tables
import { propertiesTable } from "./properties";
