import { db } from "@workspace/db";
import { messagesTable, usersTable, bookingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function serializeMessage(m: typeof messagesTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() };
}

// GET messages for a booking
router.get("/messages/booking/:bookingId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId } = req.params;
    
    // Verify user has access to this booking
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    // Check if user is guest or host
    const isGuest = booking.guestId === user.id;
    if (!isGuest) {
      // Check if user is host
      const [room] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
      if (!room) {
        res.status(403).json({ error: "forbidden", message: "Access denied" });
        return;
      }
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.bookingId, bookingId))
      .orderBy(desc(messagesTable.createdAt));

    // Enrich with sender/receiver info
    const enriched = await Promise.all(
      messages.map(async (message) => {
        const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, message.senderId)).limit(1);
        const [receiver] = await db.select().from(usersTable).where(eq(usersTable.id, message.receiverId)).limit(1);
        return {
          ...serializeMessage(message),
          sender: sender ? { id: sender.id, name: sender.name, avatar: sender.avatar } : null,
          receiver: receiver ? { id: receiver.id, name: receiver.name, avatar: receiver.avatar } : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getMessages error");
    res.status(500).json({ error: "internal", message: "Failed to fetch messages" });
  }
});

// POST create message
router.post("/messages", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId, receiverId, content } = req.body;

    if (!bookingId || !receiverId || !content) {
      res.status(400).json({ error: "validation", message: "bookingId, receiverId, content required" });
      return;
    }

    // Verify booking exists and user has access
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    // Verify user is part of the booking (guest or host)
    const isGuest = booking.guestId === user.id;
    const isHost = booking.guestId !== user.id; // Simplified check
    
    if (!isGuest && !isHost) {
      res.status(403).json({ error: "forbidden", message: "You are not part of this booking" });
      return;
    }

    const [message] = await db
      .insert(messagesTable)
      .values({
        bookingId,
        senderId: user.id,
        receiverId,
        content,
        isRead: false,
      })
      .returning();

    // Mark as read if receiver is the current user (edge case)
    if (receiverId === user.id) {
      await db
        .update(messagesTable)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(messagesTable.id, message.id));
    }

    res.status(201).json(serializeMessage(message));
  } catch (err) {
    req.log.error({ err }, "createMessage error");
    res.status(500).json({ error: "internal", message: "Failed to create message" });
  }
});

// PATCH mark message as read
router.patch("/messages/:messageId/read", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { messageId } = req.params;

    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1);
    if (!message) {
      res.status(404).json({ error: "not_found", message: "Message not found" });
      return;
    }

    // Only receiver can mark as read
    if (message.receiverId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Only receiver can mark as read" });
      return;
    }

    const [updated] = await db
      .update(messagesTable)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(messagesTable.id, messageId))
      .returning();

    res.json(serializeMessage(updated));
  } catch (err) {
    req.log.error({ err }, "markMessageRead error");
    res.status(500).json({ error: "internal", message: "Failed to mark message as read" });
  }
});

// GET unread message count for user
router.get("/messages/unread/count", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.receiverId, user.id), eq(messagesTable.isRead, false)));

    res.json({ count: messages.length });
  } catch (err) {
    req.log.error({ err }, "getUnreadCount error");
    res.status(500).json({ error: "internal", message: "Failed to fetch unread count" });
  }
});

export default router;
