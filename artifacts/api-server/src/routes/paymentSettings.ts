import { db } from "@workspace/db";
import { paymentSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET payment settings for current user
router.get("/payment-settings", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.userId, user.id)).limit(1);
    if (!settings) {
      // Return default settings if none exist
      res.json({
        acceptedPaymentMethods: ["cash"],
        defaultPaymentMethod: "cash",
        paymentTerms: "on_arrival",
        advancePaymentPercentage: "50",
        allowDelayedPayment: false,
        delayedPaymentDays: "3",
      });
      return;
    }
    res.json({
      ...settings,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "getPaymentSettings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch payment settings" });
  }
});

// PUT update payment settings
router.put("/payment-settings", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const {
      acceptedPaymentMethods,
      defaultPaymentMethod,
      upiId,
      bankDetails,
      googlePayHandle,
      phonepeHandle,
      paytmNumber,
      paymentTerms,
      advancePaymentPercentage,
      cancellationRefundPolicy,
      allowDelayedPayment,
      delayedPaymentDays,
    } = req.body;

    const [existing] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.userId, user.id)).limit(1);

    if (existing) {
      const [updated] = await db
        .update(paymentSettingsTable)
        .set({
          acceptedPaymentMethods,
          defaultPaymentMethod,
          upiId,
          bankDetails,
          googlePayHandle,
          phonepeHandle,
          paytmNumber,
          paymentTerms,
          advancePaymentPercentage,
          cancellationRefundPolicy,
          allowDelayedPayment,
          delayedPaymentDays,
          updatedAt: new Date(),
        })
        .where(eq(paymentSettingsTable.userId, user.id))
        .returning();
      res.json({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } else {
      const [created] = await db
        .insert(paymentSettingsTable)
        .values({
          userId: user.id,
          acceptedPaymentMethods,
          defaultPaymentMethod,
          upiId,
          bankDetails,
          googlePayHandle,
          phonepeHandle,
          paytmNumber,
          paymentTerms,
          advancePaymentPercentage,
          cancellationRefundPolicy,
          allowDelayedPayment,
          delayedPaymentDays,
        })
        .returning();
      res.status(201).json({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    }
  } catch (err) {
    req.log.error({ err }, "updatePaymentSettings error");
    res.status(500).json({ error: "internal", message: "Failed to update payment settings" });
  }
});

// GET payment settings by property ID (public)
router.get("/payment-settings/property/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { propertiesTable } = await import("@workspace/db");
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);
    if (!property) {
      res.status(404).json({ error: "not_found", message: "Property not found" });
      return;
    }
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.userId, property.hostId)).limit(1);
    if (!settings) {
      res.json({
        acceptedPaymentMethods: ["cash"],
        defaultPaymentMethod: "cash",
        paymentTerms: "on_arrival",
      });
      return;
    }
    res.json({
      acceptedPaymentMethods: settings.acceptedPaymentMethods,
      defaultPaymentMethod: settings.defaultPaymentMethod,
      paymentTerms: settings.paymentTerms,
      upiId: settings.upiId,
    });
  } catch (err) {
    req.log.error({ err }, "getPropertyPaymentSettings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch property payment settings" });
  }
});

export default router;
