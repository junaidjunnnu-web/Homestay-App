import { db } from "@workspace/db";
import { transactionsTable, bookingsTable, usersTable, propertiesTable, roomsTable } from "@workspace/db";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function serializeTransaction(t: typeof transactionsTable.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() };
}

// GET transactions for current user or host bookings
router.get("/transactions", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string; role: string } }).user;
  try {
    const { status, paymentMethod, bookingId } = req.query as { 
      status?: string; 
      paymentMethod?: string; 
      bookingId?: string;
    };

    let conditions: any[] = [];

    if (user.role === "host") {
      const hostProps = await db
        .select({ id: propertiesTable.id })
        .from(propertiesTable)
        .where(eq(propertiesTable.hostId, user.id));
      const propIds = hostProps.map((p) => p.id);
      let hostBookingIds: string[] = [];

      if (propIds.length > 0) {
        const rooms = await db
          .select({ id: roomsTable.id })
          .from(roomsTable)
          .where(sql`${roomsTable.propertyId} = ANY(ARRAY[${sql.raw(propIds.map((id) => `'${id}'`).join(","))}]::uuid[])`);
        const roomIds = rooms.map((r) => r.id);

        if (roomIds.length > 0) {
          const bookings = await db
            .select({ id: bookingsTable.id })
            .from(bookingsTable)
            .where(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIds.map((id) => `'${id}'`).join(","))}]::uuid[])`);
          hostBookingIds = bookings.map((b) => b.id);
        }
      }

      if (hostBookingIds.length > 0) {
        conditions.push(
          or(
            eq(transactionsTable.userId, user.id),
            sql`${transactionsTable.bookingId} = ANY(ARRAY[${sql.raw(hostBookingIds.map((id) => `'${id}'`).join(","))}]::uuid[])`
          )
        );
      } else {
        conditions.push(eq(transactionsTable.userId, user.id));
      }
    } else {
      const guestBookings = await db
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(eq(bookingsTable.guestId, user.id));
      const guestBookingIds = guestBookings.map((b) => b.id);

      if (guestBookingIds.length > 0) {
        conditions.push(
          or(
            eq(transactionsTable.userId, user.id),
            sql`${transactionsTable.bookingId} = ANY(ARRAY[${sql.raw(guestBookingIds.map((id) => `'${id}'`).join(","))}]::uuid[])`
          )
        );
      } else {
        conditions.push(eq(transactionsTable.userId, user.id));
      }
    }

    if (status) {
      conditions.push(eq(transactionsTable.status, status as "pending" | "completed" | "failed" | "refunded"));
    }
    if (paymentMethod) {
      conditions.push(eq(transactionsTable.paymentMethod, paymentMethod as any));
    }
    if (bookingId) {
      conditions.push(eq(transactionsTable.bookingId, bookingId));
    }

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.createdAt));

    // Enrich with booking and guest info
    const enriched = await Promise.all(
      transactions.map(async (transaction) => {
        const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, transaction.bookingId)).limit(1);
        const guest = booking?.guestId ? (await db.select().from(usersTable).where(eq(usersTable.id, booking.guestId)).limit(1))[0] : null;
        return {
          ...serializeTransaction(transaction),
          booking: booking ? { ...booking, referenceNumber: booking.referenceNumber, totalAmount: booking.totalAmount } : null,
          guest: guest ? { id: guest.id, name: guest.name, email: guest.email, mobile: guest.mobile } : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getTransactions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch transactions" });
  }
});

// GET transactions for a specific booking
router.get("/transactions/booking/:bookingId", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId } = req.params;
    
    // Verify user has access to this booking
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    if (booking.guestId !== user.id) {
      // Check if user is the host
      const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1);
      const [property] = room ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1) : [null];
      if (!property || property.hostId !== user.id) {
        res.status(403).json({ error: "forbidden", message: "Not your booking" });
        return;
      }
    }

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.bookingId, bookingId))
      .orderBy(desc(transactionsTable.createdAt));

    const enriched = transactions.map(serializeTransaction);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "getBookingTransactions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch booking transactions" });
  }
});

// POST create transaction
router.post("/transactions", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { bookingId, amount, paymentMethod, transactionId, upiId, proofUrl, notes } = req.body;

    if (!bookingId || !amount || !paymentMethod) {
      res.status(400).json({ error: "validation", message: "bookingId, amount, paymentMethod required" });
      return;
    }

    // Verify booking exists and user has access
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) {
      res.status(404).json({ error: "not_found", message: "Booking not found" });
      return;
    }

    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1);
    const [property] = room ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1) : [null];
    const isHost = property?.hostId === user.id;
    const isGuest = booking.guestId === user.id;

    if (!isHost && !isGuest) {
      res.status(403).json({ error: "forbidden", message: "Not your booking" });
      return;
    }

    const [transaction] = await db
      .insert(transactionsTable)
      .values({
        bookingId,
        userId: user.id,
        amount: Number(amount),
        paymentMethod,
        status: "completed",
        transactionId,
        upiId,
        proofUrl,
        notes,
      })
      .returning();

    // Update booking paid amount and payment status
    const currentPaid = booking.paidAmount || 0;
    const newPaid = currentPaid + Number(amount);
    const newPaymentStatus = newPaid >= booking.totalAmount ? "paid" : newPaid > 0 ? "partial" : "pending";

    await db
      .update(bookingsTable)
      .set({ 
        paidAmount: newPaid, 
        paymentStatus: newPaymentStatus,
        paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(bookingsTable.id, bookingId));

    res.status(201).json(serializeTransaction(transaction));
  } catch (err) {
    req.log.error({ err }, "createTransaction error");
    res.status(500).json({ error: "internal", message: "Failed to create transaction" });
  }
});

// PATCH update transaction status
router.patch("/transactions/:transactionId/status", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string } }).user;
  try {
    const { transactionId } = req.params;
    const { status, proofUrl } = req.body;

    const [transaction] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId)).limit(1);
    if (!transaction) {
      res.status(404).json({ error: "not_found", message: "Transaction not found" });
      return;
    }

    // Verify user has access
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, transaction.bookingId)).limit(1);
    const [room] = booking ? await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId)).limit(1) : [null];
    const [property] = room ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId)).limit(1) : [null];

    if (!property || property.hostId !== user.id) {
      res.status(403).json({ error: "forbidden", message: "Not your transaction" });
      return;
    }

    const [updated] = await db
      .update(transactionsTable)
      .set({ 
        status, 
        proofUrl: proofUrl || transaction.proofUrl,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, transactionId))
      .returning();

    // Recalculate booking payment status if transaction completed
    if (status === "completed" && transaction.status !== "completed") {
      const allTransactions = await db.select().from(transactionsTable).where(eq(transactionsTable.bookingId, transaction.bookingId));
      const totalPaid = allTransactions
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);
      
      const newPaymentStatus = totalPaid >= booking.totalAmount ? "paid" : totalPaid > 0 ? "partial" : "pending";
      
      await db
        .update(bookingsTable)
        .set({ 
          paidAmount: totalPaid, 
          paymentStatus: newPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(bookingsTable.id, transaction.bookingId));
    }

    res.json(serializeTransaction(updated));
  } catch (err) {
    req.log.error({ err }, "updateTransactionStatus error");
    res.status(500).json({ error: "internal", message: "Failed to update transaction status" });
  }
});

// GET payment dashboard stats
router.get("/transactions/dashboard", requireAuth, async (req, res) => {
  const user = (req as typeof req & { user: { id: string; role: string } }).user;
  try {
    // Get all properties for this host
    const hostProps = await db.select({ id: propertiesTable.id }).from(propertiesTable).where(eq(propertiesTable.hostId, user.id));
    const propIds = hostProps.map(p => p.id);

    if (propIds.length === 0) {
      res.json({
        totalCollected: 0,
        pendingAmount: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
        recentTransactions: [],
      });
      return;
    }

    // Get all rooms for these properties
    const rooms = await db
      .select({ id: roomsTable.id })
      .from(roomsTable)
      .where(sql`${roomsTable.propertyId} = ANY(ARRAY[${sql.raw(propIds.map(id => `'${id}'`).join(","))}]::uuid[])`);
    const roomIds = rooms.map(r => r.id);

    // Get all bookings for these rooms
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIds.map(id => `'${id}'`).join(","))}]::uuid[])`);

    const bookingIds = bookings.map(b => b.id);

    // Get all transactions for these bookings
    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(sql`${transactionsTable.bookingId} = ANY(ARRAY[${sql.raw(bookingIds.map(id => `'${id}'`).join(","))}]::uuid[])`);

    const totalCollected = transactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBookingsAmount = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const pendingAmount = totalBookingsAmount - totalCollected;

    const completedTransactions = transactions.filter(t => t.status === "completed").length;
    const pendingTransactions = transactions.filter(t => t.status === "pending").length;

    // Get pending bookings
    const pendingBookings = bookings.filter(b => b.paymentStatus !== "paid");

    const recentTransactions = await Promise.all(
      [...transactions]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(async (transaction) => {
          const [booking] = bookings.filter(b => b.id === transaction.bookingId);
          const guest = booking?.guestId ? (await db.select().from(usersTable).where(eq(usersTable.id, booking.guestId)).limit(1))[0] : null;
          return {
            ...serializeTransaction(transaction),
            booking: booking ? { referenceNumber: booking.referenceNumber, totalAmount: booking.totalAmount } : null,
            guest: guest ? { name: guest.name } : null,
          };
        })
    );

    res.json({
      totalCollected,
      pendingAmount,
      completedTransactionsLength: completedTransactions,
      pendingTransactionsLength: pendingTransactions,
      pendingBookings: pendingBookings.map(b => ({
        id: b.id,
        referenceNumber: b.referenceNumber,
        guestName: b.guestName,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        paymentStatus: b.paymentStatus,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
      })),
      recentTransactions,
    });
  } catch (err) {
    req.log.error({ err }, "getPaymentDashboard error");
    res.status(500).json({ error: "internal", message: "Failed to fetch payment dashboard" });
  }
});

export default router;
