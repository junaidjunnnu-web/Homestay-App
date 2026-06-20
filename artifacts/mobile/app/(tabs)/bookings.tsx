import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetGuestBookings, useGetHostBookings } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string | null>(null);

  const isHost = user?.role === "host";

  const guestBookings = useGetGuestBookings({ query: { enabled: !isHost && !!user } as any });
  const hostBookings = useGetHostBookings(
    { status: filter || undefined },
    { query: { enabled: isHost && !!user } as any }
  );

  const bookings = isHost ? hostBookings.data : guestBookings.data;
  const isLoading = isHost ? hostBookings.isLoading : guestBookings.isLoading;
  const refetch = isHost ? hostBookings.refetch : guestBookings.refetch;
  const isRefetching = isHost ? hostBookings.isRefetching : guestBookings.isRefetching;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.warning;
      case "cancelled": return colors.destructive;
      case "completed": return colors.primary;
      default: return colors.mutedForeground;
    }
  };

  const renderBooking = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/booking/track?ref=${item.referenceNumber}`)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.propertyName}>{item.property?.name}</Text>
          <Text style={styles.roomName}>{item.room?.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>
            {new Date(item.checkIn).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - {new Date(item.checkOut).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="users" size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>{item.guestCount} Guests</Text>
        </View>
        {isHost && (
          <View style={styles.infoRow}>
            <Feather name="user" size={14} color={colors.mutedForeground} />
            <Text style={styles.infoText}>{item.guestName}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.refNumber}>#{item.referenceNumber}</Text>
        <Text style={styles.amount}>₹{item.totalAmount.toLocaleString("en-IN")}</Text>
      </View>
    </Pressable>
  );

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 30 }]}>
        <Feather name="calendar" size={60} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Please log in</Text>
        <Text style={styles.emptySub}>Log in to view your bookings and manage your stays.</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>{isHost ? "Guest Bookings" : "My Bookings"}</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="calendar" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No bookings found</Text>
            </View>
          )
        }
      />
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
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  roomName: {
    fontSize: 13,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: 12,
  },
  cardBody: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#444",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refNumber: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B6B5A",
  },
  empty: {
    alignItems: "center",
    marginTop: 100,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  loginBtn: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
