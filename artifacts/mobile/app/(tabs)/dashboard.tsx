import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostDashboard, useUpdateBookingStatus } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const { data: stats, isLoading, refetch, isRefetching } = useGetHostDashboard();
  const { mutate: updateStatus } = useUpdateBookingStatus();

  const handleAction = (bookingId: string, status: "confirmed" | "cancelled") => {
    updateStatus({ bookingId, data: { status } }, {
      onSuccess: () => refetch()
    });
  };

  const openWhatsApp = (mobile: string, message: string) => {
    const url = `https://wa.me/91${mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statCards = [
    { label: "Occupancy", value: `${stats?.occupancyPercent}%`, icon: "percent" },
    { label: "Revenue", value: `₹${stats?.revenueThisMonth.toLocaleString("en-IN")}`, icon: "trending-up" },
    { label: "Today Check-ins", value: stats?.todayCheckIns, icon: "log-in" },
    { label: "Pending Bookings", value: stats?.pendingBookings, icon: "clock" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Namaste, {user?.name}</Text>
        <Text style={styles.subGreeting}>Here is what is happening today</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={stat.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            {stats?.pendingBookings! > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                <Text style={styles.badgeText}>{stats?.pendingBookings}</Text>
              </View>
            )}
          </View>

          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            stats.recentBookings.filter(b => b.status === "pending").map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.guestName}>{booking.guestName}</Text>
                  <Text style={styles.bookingDates}>
                    {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={styles.propertyRoom}>{booking.property?.name} • {booking.room?.name}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable 
                    style={[styles.actionBtn, { backgroundColor: colors.success }]}
                    onPress={() => handleAction(booking.id, "confirmed")}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </Pressable>
                  <Pressable 
                    style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
                    onPress={() => handleAction(booking.id, "cancelled")}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </Pressable>
                  <Pressable 
                    style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                    onPress={() => openWhatsApp(booking.guestMobile || "", `Hi ${booking.guestName}, regarding your booking at ${booking.property?.name}...`)}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No pending bookings</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today Check-ins</Text>
          {stats?.todayCheckIns === 0 ? (
            <Text style={styles.emptyText}>No check-ins for today</Text>
          ) : (
            <Text style={styles.emptyText}>Check-in list view would be here</Text>
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
    padding: 20,
    marginBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B6B5A",
  },
  subGreeting: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
  },
  statCard: {
    width: "45%",
    margin: "2.5%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    color: "#666",
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  bookingCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  bookingInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  bookingDates: {
    fontSize: 13,
    color: "#1B6B5A",
    fontWeight: "600",
    marginBottom: 2,
  },
  propertyRoom: {
    fontSize: 12,
    color: "#666",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
});
