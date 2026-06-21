import {
  ActivityIndicator,
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
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostDashboard } from "@workspace/api-client-react";
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
  const { user } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading, refetch, isRefetching } = useGetHostDashboard();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statCards = [
    { label: "Properties", value: stats?.totalProperties || 0, icon: "home", color: "#6366F1", route: "/(tabs)/properties" },
    { label: "Pending", value: stats?.pendingBookings || 0, icon: "clock", color: "#F59E0B", route: "/(tabs)/bookings" },
    { label: "Revenue", value: `₹${((stats?.revenueThisMonth || 0) / 1000).toFixed(1)}k`, icon: "trending-up", color: "#10B981", route: "/(tabs)/finance" },
    { label: "Occupancy", value: `${stats?.occupancyPercent || 0}%`, icon: "bar-chart", color: "#8B5CF6", route: "/(tabs)/finance" },
  ];

  const quickActions = [
    { label: "Add Property", icon: "plus-circle", color: "#6366F1", route: "/property/add" },
    { label: "Add Booking", icon: "plus-square", color: "#3B82F6", route: "/booking/add" },
    { label: "Guest Register", icon: "users", color: "#10B981", route: "/guest-register" },
    { label: "Housekeeping", icon: "check-square", color: "#8B5CF6", route: "/housekeeping" },
    { label: "Menu", icon: "coffee", color: "#E8824A", route: "/menu" },
    { label: "Staff", icon: "user-plus", color: "#EC4899", route: "/staff" },
    { label: "Finance", icon: "bar-chart-2", color: "#27AE60", route: "/(tabs)/finance" },
    { label: "More", icon: "grid", color: "#8A7A6E", route: "/(tabs)/more" },
  ];

  const openWhatsApp = (mobile: string, guestName: string, ref: string) => {
    if (!mobile) return;
    Linking.openURL(
      `https://wa.me/91${mobile}?text=${encodeURIComponent(`Hi ${guestName}, your booking #${ref} is confirmed. Thank you for choosing us!`)}`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userNameText}>{user?.name || "Host"}</Text>
          </View>
          <Pressable
            style={styles.notifBtn}
            onPress={() => router.push("/(tabs)/bookings")}
          >
            <Feather name="bell" size={20} color="#fff" />
            {(stats?.pendingBookings || 0) > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats?.pendingBookings}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <Pressable
              key={index}
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
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Today at a Glance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY AT A GLANCE</Text>
          <View style={styles.glanceRow}>
            <View style={[styles.glanceCard, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="log-in-outline" size={22} color="#3B82F6" />
              <Text style={styles.glanceNum}>—</Text>
              <Text style={styles.glanceLabel}>Check-ins</Text>
            </View>
            <View style={[styles.glanceCard, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="log-out-outline" size={22} color="#10B981" />
              <Text style={styles.glanceNum}>—</Text>
              <Text style={styles.glanceLabel}>Check-outs</Text>
            </View>
            <View style={[styles.glanceCard, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="bed-outline" size={22} color="#F59E0B" />
              <Text style={styles.glanceNum}>{stats?.occupancyPercent || 0}%</Text>
              <Text style={styles.glanceLabel}>Occupancy</Text>
            </View>
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
            stats.recentBookings.slice(0, 5).map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
                <View style={styles.bookingLeft}>
                  <View style={[styles.bookingAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.bookingAvatarText, { color: colors.primary }]}>
                      {(booking as any).guestName?.charAt(0)?.toUpperCase() || "G"}
                    </Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingGuest}>{(booking as any).guestName || "Guest"}</Text>
                    <Text style={styles.bookingRef}>#{booking.referenceNumber} · {booking.property?.name}</Text>
                    <Text style={styles.bookingDates}>
                      {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      {" - "}
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
                    <Pressable onPress={() => openWhatsApp((booking as any).guestMobile, (booking as any).guestName || "Guest", booking.referenceNumber)}>
                      <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyBookings, { backgroundColor: colors.surface }]}>
              <Feather name="calendar" size={36} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No recent bookings</Text>
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
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: { fontSize: 15, color: "rgba(255,255,255,0.85)" },
  userNameText: { fontSize: 26, fontWeight: "800", color: "#fff", marginTop: 2 },
  notifBtn: { position: "relative", padding: 8 },
  notifBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  scrollContent: { paddingTop: 0 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: -30,
    gap: 10,
  },
  statCard: {
    width: "47%",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#8A7A6E" },
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  seeAllText: { fontSize: 13, fontWeight: "700" },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: { fontSize: 10, fontWeight: "700", textAlign: "center", color: "#8A7A6E" },
  glanceRow: { flexDirection: "row", gap: 10 },
  glanceCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  glanceNum: { fontSize: 20, fontWeight: "800" },
  glanceLabel: { fontSize: 11, fontWeight: "600", color: "#8A7A6E" },
  bookingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  bookingLeft: { flexDirection: "row", gap: 10, flex: 1, alignItems: "center" },
  bookingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  bookingAvatarText: { fontSize: 18, fontWeight: "800" },
  bookingInfo: { flex: 1 },
  bookingGuest: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  bookingRef: { fontSize: 11, color: "#8A7A6E", marginBottom: 2 },
  bookingDates: { fontSize: 11, color: "#8A7A6E" },
  bookingRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: "800" },
  bookingAmount: { fontSize: 14, fontWeight: "800" },
  emptyBookings: {
    alignItems: "center",
    padding: 30,
    borderRadius: 20,
    gap: 10,
  },
  emptyText: { color: "#8A7A6E", fontSize: 14, marginBottom: 4 },
  addBookingBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  addBookingBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
