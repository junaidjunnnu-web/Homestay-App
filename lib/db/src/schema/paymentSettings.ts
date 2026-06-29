import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const paymentSettingsTable = pgTable("payment_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  acceptedPaymentMethods: text("accepted_payment_methods").array().notNull().default(["cash"]),
  defaultPaymentMethod: text("default_payment_method", { 
    enum: ["cash", "upi", "bank_transfer", "card", "google_pay", "phonepe", "paytm"] 
  }).notNull().default("cash"),
  upiId: text("upi_id"),
  bankDetails: jsonb("bank_details").$type<{
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
    bankName: string;
  }>(),
  googlePayHandle: text("google_pay_handle"),
  phonepeHandle: text("phonepe_handle"),
  paytmNumber: text("paytm_number"),
  paymentTerms: text("payment_terms", { enum: ["advance", "on_arrival", "on_checkout"] }).notNull().default("on_arrival"),
  advancePaymentPercentage: text("advance_payment_percentage").notNull().default("50"),
  cancellationRefundPolicy: text("cancellation_refund_policy"),
  allowDelayedPayment: boolean("allow_delayed_payment").notNull().default(false),
  delayedPaymentDays: text("delayed_payment_days").notNull().default("3"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSettingsSchema = createInsertSchema(paymentSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;
export type PaymentSettings = typeof paymentSettingsTable.$inferSelect;
