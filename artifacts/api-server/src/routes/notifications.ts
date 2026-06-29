import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

interface NotificationData {
  type: "payment_received" | "payment_pending" | "payment_overdue" | "booking_confirmed" | "payment_reminder";
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  bookingId?: string;
  amount?: number;
  paymentMethod?: string;
  dueDate?: string;
  propertyId?: string;
  propertyName?: string;
}

// Send notification
router.post("/send", requireAuth, async (req, res) => {
  const { type, recipientId, recipientEmail, recipientPhone, bookingId, amount, paymentMethod, dueDate, propertyName }: NotificationData = req.body;

  try {
    // Send WhatsApp notification
    if (recipientPhone) {
      await sendWhatsAppNotification({
        type,
        phone: recipientPhone,
        bookingId,
        amount,
        paymentMethod,
        dueDate,
        propertyName,
      });
    }

    // Send email notification
    if (recipientEmail) {
      await sendEmailNotification({
        type,
        email: recipientEmail,
        bookingId,
        amount,
        paymentMethod,
        dueDate,
        propertyName,
      });
    }

    // Store in-app notification (would save to database in production)
    await storeInAppNotification({
      type,
      recipientId,
      bookingId,
      amount,
      paymentMethod,
      dueDate,
    });

    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    req.log.error({ error }, "Notification send error");
    res.status(500).json({ error: "internal", message: "Failed to send notification" });
  }
});

// Send payment reminder
router.post("/payment-reminder", requireAuth, async (req, res) => {
  const { bookingId, guestId, guestEmail, guestPhone, amount, dueDate, propertyName } = req.body;

  try {
    if (guestPhone) {
      const reminderMessage = `Payment Reminder 💰\n\nDear Guest,\n\nThis is a friendly reminder that your payment of ₹${amount?.toLocaleString("en-IN")} for your booking at ${propertyName} is due by ${dueDate}.\n\nPlease complete your payment to avoid any inconvenience.\n\nThank you!`;
      
      // WhatsApp API integration would go here
      // For now, log the message
      req.log.info({ type: "WhatsApp reminder", to: guestPhone, message: reminderMessage });
    }

    if (guestEmail) {
      // Email integration would go here
      req.log.info({ type: "Email reminder", to: guestEmail, amount, dueDate });
    }

    res.json({ success: true, message: "Payment reminder sent" });
  } catch (error) {
    req.log.error({ error }, "Payment reminder error");
    res.status(500).json({ error: "internal", message: "Failed to send reminder" });
  }
});

// Get user notifications
router.get("/user", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id;

  try {
    // Fetch notifications from database
    // For now, return mock data
    const notifications = [
      {
        id: "1",
        type: "payment_received",
        title: "Payment Received",
        message: "₹5,000 received for booking #12345",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    res.json({ notifications });
  } catch (error) {
    req.log.error({ error }, "Fetch notifications error");
    res.status(500).json({ error: "internal", message: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Update notification in database
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    req.log.error({ error }, "Mark notification read error");
    res.status(500).json({ error: "internal", message: "Failed to mark notification as read" });
  }
});

// Helper functions
async function sendWhatsAppNotification(data: any) {
  // WhatsApp Business API integration
  // For now, log the notification
  const messageMap: Record<string, string> = {
    payment_received: `Payment Received ✅\n\nYour payment of ₹${data.amount} has been received successfully.\n\nBooking: #${data.bookingId}\nMethod: ${data.paymentMethod}\n\nThank you!`,
    payment_pending: `Payment Pending ⏳\n\nYour payment of ₹${data.amount} is pending.\n\nBooking: #${data.bookingId}\nDue: ${data.dueDate}\n\nPlease complete payment soon.`,
    payment_overdue: `Payment Overdue ⚠️\n\nYour payment of ₹${data.amount} is overdue.\n\nBooking: #${data.bookingId}\nDue: ${data.dueDate}\n\nPlease complete payment immediately.`,
    booking_confirmed: `Booking Confirmed 🎉\n\nYour booking at ${data.propertyName} has been confirmed!\n\nBooking: #${data.bookingId}\n\nThank you for choosing us!`,
    payment_reminder: `Payment Reminder 💰\n\nFriendly reminder: Your payment of ₹${data.amount} is due by ${data.dueDate}.\n\nBooking: #${data.bookingId}\n\nPlease complete payment.`,
  };

  const message = messageMap[data.type] || "Notification";
  // Would call WhatsApp API here
}

async function sendEmailNotification(data: any) {
  // Email service integration (SendGrid, AWS SES, etc.)
  // For now, log the notification
  const subjects: Record<string, string> = {
    payment_received: "Payment Received - Homestay Booking",
    payment_pending: "Payment Pending - Homestay Booking",
    payment_overdue: "Payment Overdue - Action Required",
    booking_confirmed: "Booking Confirmed - Homestay",
    payment_reminder: "Payment Reminder - Homestay Booking",
  };

  const subject = subjects[data.type] || "Notification";
  // Would call email service here
}

async function storeInAppNotification(data: any) {
  // Store notification in database for in-app display
  // Would insert into notifications table
}

export default router;
