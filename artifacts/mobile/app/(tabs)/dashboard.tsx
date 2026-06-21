import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetHostDashboard,
  useGetHostBookings,
  useUpdateBookingStatus,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#10B981",
  pending: "#F59E0B",
  cancelled: "#EF4444",
  completed: "#6366F1",
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading, refetch, isRefetching } = useGetHostDashboard();
  const { data: allBookings = [], refetch: refetchBookings } = useGetHostBookings({});
  const { mutate: updateStatus } = useUpdateBookingStatus();

  const bookingsArr = allBookings as any[];

  // Today's check-ins and check-outs
  const todayStr = new Date().toISOString().split("T")[0]!;
  const todayCheckins = useMemo(
    () => bookingsArr.filter(b => b.checkIn === todayStr && b.status === "confirmed").length,
    [bookingsArr, todayStr]
  );
  const todayCheckouts = useMemo(
    () => bookingsArr.filter(b => b.checkOut === todayStr && b.status === "confirmed").length,
    [bookingsArr, todayStr]
  );

  // Pending bookings from guests
  const pendingBookings = useMemo(
    () => bookingsArr.filter(b => b.status === "pending").slice(0, 5),
    [bookingsArr]
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const confirmBooking = (id: string, guestName: string) => {
    Alert.alert("Confirm Booking", `Confirm booking for ${guestName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          updateStatus(
            { bookingId: id, data: { status: "confirmed" } },
            {
              onSuccess: () => {
                refetch();
                refetchBookings();
              },
            }
          );
        },
      },
    ]);
  };

  const declineBooking = (id: string, guestName: string) => {
    Alert.alert("Decline Booking", `Decline booking for ${guestName}? This will cancel it.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: () => {
          updateStatus(
            { bookingId: id, data: { status: "cancelled" } },
            {
              onSuccess: () => {
                refetch();
                refetchBookings();
              },
            }
          );
        },
      },
    ]);
  };

  const openWhatsApp = (mobile: string, guestName: string, ref: string, status: string) => {
    if (!mobile) return;
    const msg = status === "confirmed"
      ? `Hi ${guestName}! 🎉 Your booking #${ref} has been confirmed. We look forward to hosting you!`
      : `Hi ${guestName}, your booking #${ref} has been received. We'll confirm it shortly.`;
    Linking.openURL(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const quickActions = [
    { label: "Add Property", icon: "home", color: "#6366F1", route: "/property/add" },
    { label: "Add Booking", icon: "plus-square", color: "#3B82F6", route: "/booking/add" },
    { label: "Bookings", icon: "calendar", color: colors.primary, route: "/(tabs)/bookings" },
    { label: "Properties", icon: "layers", color: "#6366F1", route: "/(tabs)/properties" },
    { label: "Housekeeping", icon: "check-square", color: "#8B5CF6", route: "/housekeeping" },
    { label: "Menu", icon: "coffee", color: "#E8824A", route: "/menu" },
    { label: "Staff", icon: "users", color: "#EC4899", route: "/staff" },
    { label: "Finance", icon: "bar-chart-2", color: "#27AE60", route: "/(tabs)/finance" },
    { label: "Guests", icon: "user", color: "#10B981", route: "/guest-register" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userNameText}>{user?.name || "Host"}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerBtn} onPress={() => router.push("/(tabs)/bookings")}>
              <Feather name="bell" size={20} color="#fff" />
              {(stats?.pendingBookings || 0) > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{stats?.pendingBookings}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.headerBtn} onPress={handleLogout}>
              <Feather name="log-out" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchBookings(); }} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          {[
            { label: "Properties", value: stats?.totalProperties || 0, icon: "home", color: "#6366F1", route: "/(tabs)/properties" },
            { label: "Pending", value: stats?.pendingBookings || 0, icon: "clock", color: "#F59E0B", route: "/(tabs)/bookings" },
            { label: "Revenue", value: `₹${((stats?.revenueThisMonth || 0) / 1000).toFixed(1)}k`, icon: "trending-up", color: "#10B981", route: "/(tabs)/finance" },
            { label: "Occupancy", value: `${stats?.occupancyPercent || 0}%`, icon: "bar-chart", color: "#8B5CF6", route: "/(tabs)/finance" },
          ].map((stat, i) => (
            <Pressable
              key={i}
              style={[styles.statCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push(stat.route as any)}
            >
              <View style={[styles.statIconCircle, { backgroundColor: stat.color + "15" }]}>
                <Feather name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Pending Guest Bookings (to confirm/decline) */}
        {pendingBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.urgentDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.sectionLabel}>PENDING BOOKINGS · ACTION NEEDED</Text>
              </View>
              <Pressable onPress={() => router.push("/(tabs)/bookings")}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all →</Text>
              </Pressable>
            </View>

            {pendingBookings.map((booking) => (
              <View key={booking.id} style={[styles.pendingCard, { backgroundColor: colors.surface, borderLeftColor: "#F59E0B" }]}>
                <View style={styles.pendingTop}>
                  <View style={[styles.bookingAvatar, { backgroundColor: "#F59E0B15" }]}>
                    <Text style={[styles.bookingAvatarText, { color: "#F59E0B" }]}>
                      {booking.guestName?.charAt(0)?.toUpperCase() || "G"}
                    </Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingGuest}>{booking.guestName || "Guest"}</Text>
                    <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
                      #{booking.referenceNumber} · {booking.property?.name}
                    </Text>
                    <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
                      {booking.checkIn} → {booking.checkOut} · ₹{booking.totalAmount?.toLocaleString("en-IN")}
                    </Text>
                    {booking.room?.name && (
                      <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
                        🛏 {booking.room.name}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.pendingActions}>
                  <Pressable
                    style={[styles.declineBtn, { borderColor: "#EF4444" }]}
                    onPress={() => declineBooking(booking.id, booking.guestName || "Guest")}
                  >
                    <Feather name="x" size={14} color="#EF4444" />
                    <Text style={[styles.declineBtnText, { color: "#EF4444" }]}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => confirmBooking(booking.id, booking.guestName || "Guest")}
                  >
                    <Feather name="check" size={14} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  </Pressable>
                  {booking.guestMobile && (
                    <Pressable
                      style={[styles.waSmallBtn, { backgroundColor: "#25D36620" }]}
                      onPress={() => openWhatsApp(booking.guestMobile, booking.guestName || "Guest", booking.referenceNumber, booking.status)}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <Pressable
                key={index}
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: action.color + "15" }]}>
                  <Feather name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Today at a Glance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY AT A GLANCE</Text>
          <View style={styles.glanceRow}>
            <Pressable
              style={[styles.glanceCard, { backgroundColor: "#EFF6FF" }]}
              onPress={() => router.push("/(tabs)/bookings")}
            >
              <Ionicons name="log-in-outline" size={22} color="#3B82F6" />
              <Text style={[styles.glanceNum, { color: "#1D4ED8" }]}>{todayCheckins}</Text>
              <Text style={styles.glanceLabel}>Check-ins</Text>
            </Pressable>
            <Pressable
              style={[styles.glanceCard, { backgroundColor: "#F0FDF4" }]}
              onPress={() => router.push("/(tabs)/bookings")}
            >
              <Ionicons name="log-out-outline" size={22} color="#10B981" />
              <Text style={[styles.glanceNum, { color: "#065F46" }]}>{todayCheckouts}</Text>
              <Text style={styles.glanceLabel}>Check-outs</Text>
            </Pressable>
            <Pressable
              style={[styles.glanceCard, { backgroundColor: "#FFF7ED" }]}
              onPress={() => router.push("/(tabs)/finance")}
            >
              <Ionicons name="bed-outline" size={22} color="#F59E0B" />
              <Text style={[styles.glanceNum, { color: "#92400E" }]}>{stats?.occupancyPercent || 0}%</Text>
              <Text style={styles.glanceLabel}>Occupancy</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>RECENT BOOKINGS</Text>
            <Pressable onPress={() => router.push("/(tabs)/bookings")}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See all →</Text>
            </Pressable>
          </View>

          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            stats.recentBookings
              .filter((b) => b.status !== "pending")
              .slice(0, 5)
              .map((booking) => (
                <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.bookingLeft}>
                    <View style={[styles.bookingAvatar, { backgroundColor: (STATUS_COLORS[booking.status] || colors.primary) + "15" }]}>
                      <Text style={[styles.bookingAvatarText, { color: STATUS_COLORS[booking.status] || colors.primary }]}>
                        {(booking as any).guestName?.charAt(0)?.toUpperCase() || "G"}
                      </Text>
                    </View>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingGuest}>{(booking as any).guestName || "Guest"}</Text>
                      <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
                        #{booking.referenceNumber} · {booking.property?.name}
                      </Text>
                      <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
                        {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {" – "}
                        {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingRight}>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[booking.status] || colors.primary) + "15" }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[booking.status] || colors.primary }]}>
                        {booking.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.bookingAmount}>₹{booking.totalAmount.toLocaleString("en-IN")}</Text>
                    {(booking as any).guestMobile && (
                      <Pressable onPress={() => openWhatsApp((booking as any).guestMobile, (booking as any).guestName || "Guest", booking.referenceNumber, booking.status)}>
                        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
          ) : (
            <View style={[styles.emptyBookings, { backgroundColor: colors.surface }]}>
              <Feather name="calendar" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent bookings</Text>
              <Pressable
                style={[styles.addBookingBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/booking/add")}
              >
                <Text style={styles.addBookingBtnText}>Add First Booking</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greetingText: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  userNameText: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { position: "relative", padding: 10 },
  notifBadge: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: "#EF4444", borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: "center", alignItems: "center",
  },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  scrollContent: { paddingTop: 0 },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 12, marginTop: -30, gap: 10,
  },
  statCard: {
    width: "47%", padding: 18, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  statIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  statValue: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#8A7A6E" },
  section: { paddingHorizontal: 16, marginTop: 26 },
  sectionLabel: {
    fontSize: 11, fontWeight: "800", color: "#8A7A6E",
    letterSpacing: 1.2, marginBottom: 12,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgentDot: { width: 8, height: 8, borderRadius: 4 },
  seeAllText: { fontSize: 13, fontWeight: "700" },
  pendingCard: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  pendingTop: { flexDirection: "row", gap: 10, marginBottom: 12 },
  pendingActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  declineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
  },
  declineBtnText: { fontSize: 13, fontWeight: "700" },
  confirmBtn: {
    flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 8, borderRadius: 10,
  },
  confirmBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  waSmallBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    width: "30%", paddingVertical: 14,
    borderRadius: 16, alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  actionIconCircle: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  actionLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  glanceRow: { flexDirection: "row", gap: 10 },
  glanceCard: {
    flex: 1, padding: 14, borderRadius: 16, alignItems: "center", gap: 6,
  },
  glanceNum: { fontSize: 22, fontWeight: "800" },
  glanceLabel: { fontSize: 11, fontWeight: "600", color: "#8A7A6E" },
  bookingCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14, borderRadius: 16, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  bookingLeft: { flexDirection: "row", gap: 10, flex: 1, alignItems: "flex-start" },
  bookingAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  bookingAvatarText: { fontSize: 18, fontWeight: "800" },
  bookingInfo: { flex: 1 },
  bookingGuest: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  bookingMeta: { fontSize: 11, marginBottom: 1 },
  bookingRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: "800" },
  bookingAmount: { fontSize: 14, fontWeight: "800" },
  emptyBookings: {
    alignItems: "center", padding: 30, borderRadius: 20, gap: 10,
  },
  emptyText: { fontSize: 14, marginBottom: 4 },
  addBookingBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4,
  },
  addBookingBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
