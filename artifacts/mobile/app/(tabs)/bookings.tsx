import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetGuestBookings,
  useGetHostBookings,
  useUpdateBookingStatus,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

function buildDateStrip() {
  const days: string[] = [];
  const today = new Date();
  for (let i = -3; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split("T")[0]!);
  }
  return days;
}

const DATE_STRIP = buildDateStrip();
const TODAY = new Date().toISOString().split("T")[0]!;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  const isHost = user?.role === "host";

  const guestQuery = useGetGuestBookings({ query: { enabled: !isHost && !!user } } as any);
  const hostQuery = useGetHostBookings(
    { status: filter === "All" ? undefined : filter.toLowerCase() as any },
    { query: { enabled: isHost && !!user } } as any
  );

  const { mutate: updateStatus } = useUpdateBookingStatus();

  const bookings = isHost ? hostQuery.data : guestQuery.data;
  const isLoading = isHost ? hostQuery.isLoading : guestQuery.isLoading;
  const refetch = isHost ? hostQuery.refetch : guestQuery.refetch;
  const isRefetching = isHost ? hostQuery.isRefetching : guestQuery.isRefetching;

  // Which dates have at least one booking (for host calendar strip)
  const bookedDates = useMemo(() => {
    if (!bookings) return new Set<string>();
    const s = new Set<string>();
    for (const b of bookings) {
      const ci = new Date(b.checkIn + "T00:00:00");
      const co = new Date(b.checkOut + "T00:00:00");
      const d = new Date(ci);
      while (d < co) {
        s.add(d.toISOString().split("T")[0]!);
        d.setDate(d.getDate() + 1);
      }
    }
    return s;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    let list = isHost ? bookings : bookings.filter(b =>
      filter === "All" ? true : b.status === filter.toLowerCase()
    );
    if (calendarDate) {
      list = list.filter(b => b.checkIn <= calendarDate && b.checkOut > calendarDate);
    }
    return list;
  }, [bookings, filter, isHost, calendarDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.warning;
      case "cancelled": return colors.destructive;
      case "completed": return "#7C3AED";
      default: return colors.mutedForeground;
    }
  };

  const confirmBooking = (id: string) => {
    updateStatus({ bookingId: id, data: { status: "confirmed" } }, {
      onSuccess: () => refetch(),
    });
  };

  const cancelBooking = (id: string) => {
    updateStatus({ bookingId: id, data: { status: "cancelled" } }, {
      onSuccess: () => refetch(),
    });
  };

  const sendWhatsAppToGuest = (item: any) => {
    const mobile = item.guestMobile;
    if (!mobile) return;
    const status = item.status === "confirmed" ? "confirmed ✅" : "received";
    const msg = `Hi ${item.guestName}! 🏡\n\nYour booking at ${item.property?.name || "our homestay"} has been ${status}.\n\n📋 Reference: #${item.referenceNumber}\n📅 Check-in: ${item.checkIn}\n📅 Check-out: ${item.checkOut}\n🛏 Room: ${item.room?.name}\n💰 Amount: ₹${item.totalAmount?.toLocaleString("en-IN")}\n\nLooking forward to hosting you! 😊`;
    Linking.openURL(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`);
  };

  const openUPI = (item: any) => {
    const upiId = item.property?.upiId;
    if (!upiId) return;
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(item.property.name)}&am=${item.totalAmount}&tn=Booking%20${item.referenceNumber}&cu=INR`;
    Linking.openURL(upiUrl);
  };

  const renderBooking = ({ item }: { item: any }) => {
    const checkIn = new Date(item.checkIn + "T00:00:00");
    const checkOut = new Date(item.checkOut + "T00:00:00");
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const isActive = item.status === "confirmed" || item.status === "pending";

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.refBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.refText, { color: colors.primary }]}>#{item.referenceNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            {isHost && item.guestMobile ? (
              <Pressable onPress={() => sendWhatsAppToGuest(item)} hitSlop={8}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Property & Room */}
        <Text style={styles.propertyName} numberOfLines={1}>
          {item.property?.name || "Homestay"}
        </Text>
        <Text style={[styles.roomInfo, { color: colors.mutedForeground }]}>
          {item.room?.name ?? "—"}
          {item.room?.type ? ` · ${item.room.type}` : ""}
        </Text>

        {/* Guest info for host */}
        {isHost && (
          <View style={[styles.guestRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="user" size={13} color={colors.mutedForeground} />
            <Text style={[styles.guestText, { color: colors.foreground }]}>{item.guestName}</Text>
            {item.guestMobile ? (
              <Text style={[styles.guestMobile, { color: colors.mutedForeground }]}>+91 {item.guestMobile}</Text>
            ) : null}
          </View>
        )}

        {/* Dates */}
        <View style={[styles.datesRow, { backgroundColor: colors.background }]}>
          <View style={styles.dateBlock}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {checkIn.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </View>
          <View style={[styles.nightsBadge, { borderColor: colors.border }]}>
            <Feather name="moon" size={11} color={colors.mutedForeground} />
            <Text style={[styles.nightsText, { color: colors.mutedForeground }]}>{nights}n</Text>
          </View>
          <View style={[styles.dateBlock, { alignItems: "flex-end" }]}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {checkOut.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
            <Text style={[styles.amountValue, { color: colors.foreground }]}>
              ₹{item.totalAmount?.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={[styles.payBadge, { backgroundColor: item.paymentStatus === "paid" ? "#10B98115" : colors.warning + "15" }]}>
            <Text style={[styles.payText, { color: item.paymentStatus === "paid" ? "#10B981" : colors.warning }]}>
              {item.paymentStatus === "paid" ? "PAID" : "UNPAID"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {isHost && item.status === "pending" && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => confirmBooking(item.id)}
            >
              <Feather name="check" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm</Text>
            </Pressable>
          )}
          {!isHost && item.status === "confirmed" && item.property?.upiId && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => openUPI(item)}>
              <Ionicons name="qr-code" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Pay via UPI</Text>
            </Pressable>
          )}
          {isActive && (
            <Pressable
              style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.destructive, backgroundColor: "transparent" }]}
              onPress={() => cancelBooking(item.id)}
            >
              <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="calendar" size={64} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Please log in</Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          Log in to view and manage your bookings.
        </Text>
        <Pressable
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isHost ? "Guest Bookings" : "My Bookings"}
        </Text>
        {isHost && (
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/booking/add")}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add Booking</Text>
          </Pressable>
        )}
      </View>

      {/* Host: Date strip calendar */}
      {isHost && (
        <View style={{ marginBottom: 4 }}>
          <Text style={[styles.calendarLabel, { color: colors.mutedForeground }]}>
            {calendarDate ? `Showing bookings for ${calendarDate}` : "Tap a date to filter"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
          >
            {DATE_STRIP.map((dateStr) => {
              const d = new Date(dateStr + "T00:00:00");
              const dayLabel = DAY_LABELS[d.getDay()];
              const dayNum = d.getDate();
              const isToday = dateStr === TODAY;
              const hasBooking = bookedDates.has(dateStr);
              const isSelected = calendarDate === dateStr;
              return (
                <Pressable
                  key={dateStr}
                  onPress={() => setCalendarDate(isSelected ? null : dateStr)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isToday
                        ? colors.primary + "15"
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : isToday ? colors.primary : colors.border,
                      borderWidth: isToday || isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillDay,
                      { color: isSelected ? "#fff" : isToday ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {dayLabel}
                  </Text>
                  <Text
                    style={[
                      styles.datePillNum,
                      { color: isSelected ? "#fff" : isToday ? colors.primary : colors.foreground },
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {hasBooking && (
                    <View
                      style={[
                        styles.bookingDot,
                        { backgroundColor: isSelected ? "#fff" : colors.primary },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={{ marginBottom: 8 }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f ? colors.primary : colors.surface, borderColor: filter === f ? colors.primary : colors.border },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="calendar" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, marginTop: 16 }]}>
                {calendarDate ? "No bookings on this date" : "No bookings found"}
              </Text>
              {calendarDate ? (
                <Pressable onPress={() => setCalendarDate(null)}>
                  <Text style={[styles.clearFilter, { color: colors.primary }]}>Clear date filter</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  calendarLabel: { fontSize: 11, fontWeight: "600", paddingHorizontal: 20, marginBottom: 8 },
  dateStrip: { paddingHorizontal: 16, gap: 8 },
  datePill: {
    width: 52,
    height: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
  },
  datePillDay: { fontSize: 10, fontWeight: "700" },
  datePillNum: { fontSize: 18, fontWeight: "800" },
  bookingDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  filterList: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, paddingBottom: 120 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  refBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  refText: { fontSize: 12, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "800" },
  propertyName: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  roomInfo: { fontSize: 13, marginBottom: 10 },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  guestText: { fontSize: 14, fontWeight: "700", flex: 1 },
  guestMobile: { fontSize: 12 },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateBlock: { flex: 1 },
  dateLabel: { fontSize: 9, fontWeight: "800", marginBottom: 4 },
  dateValue: { fontSize: 13, fontWeight: "700" },
  nightsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
  },
  nightsText: { fontSize: 11, fontWeight: "700" },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amountLabel: { fontSize: 11, marginBottom: 2 },
  amountValue: { fontSize: 20, fontWeight: "800" },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  payText: { fontSize: 10, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  clearFilter: { fontSize: 14, fontWeight: "700", marginTop: 8 },
  loginBtn: { width: "100%", height: 52, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
