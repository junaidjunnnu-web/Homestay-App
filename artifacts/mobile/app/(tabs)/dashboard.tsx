import {
  ActivityIndicator,
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
    { label: "Properties", value: stats?.totalProperties || 0, icon: "home", color: "#3B82F6" },
    { label: "Pending", value: stats?.pendingBookings || 0, icon: "clock", color: "#F59E0B" },
    { label: "Revenue", value: `₹${((stats?.revenueThisMonth || 0) / 1000).toFixed(1)}k`, icon: "trending-up", color: "#10B981" },
    { label: "Occupancy", value: `${stats?.occupancyPercent || 0}%`, icon: "bar-chart", color: "#8B5CF6" },
  ];

  const quickActions = [
    { label: "Add Property", icon: "plus-circle", route: "/property/add" },
    { label: "View Bookings", icon: "calendar", route: "/(tabs)/bookings" },
    { label: "Finance", icon: "bar-chart", route: "/(tabs)/finance" },
    { label: "Housekeeping", icon: "check-square", route: "/housekeeping" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greetingText}>Good day,</Text>
            <Text style={styles.userNameText}>{user?.name}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.statIconCircle, { backgroundColor: stat.color + "15" }]}>
                <Feather name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <Pressable 
                key={index} 
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push(action.route as any)}
              >
                <Feather name={action.icon as any} size={24} color={colors.primary} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT BOOKINGS</Text>
            <Pressable onPress={() => router.push("/(tabs)/bookings")}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>

          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            stats.recentBookings.slice(0, 5).map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingRef}>#{booking.referenceNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={[styles.statusText, { color: colors.primary }]}>{booking.status}</Text>
                  </View>
                </View>
                <Text style={styles.bookingProperty}>{booking.property?.name}</Text>
                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingDates}>
                    {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={styles.bookingAmount}>₹{booking.totalAmount.toLocaleString("en-IN")}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent bookings</Text>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  userNameText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  scrollContent: {
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    marginTop: -40,
  },
  statCard: {
    width: "45%",
    margin: "2.5%",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
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
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8A7A6E",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  actionCard: {
    width: "47%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8A7A6E",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bookingCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingRef: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A6E",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  bookingProperty: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingDates: {
    fontSize: 13,
    color: "#8A7A6E",
  },
  bookingAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    textAlign: "center",
    color: "#8A7A6E",
    marginTop: 20,
    fontStyle: "italic",
  },
});
