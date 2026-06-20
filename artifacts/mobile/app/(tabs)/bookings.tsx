import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Linking,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetGuestBookings, useGetHostBookings, useUpdateBookingStatus } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const FILTERS = ["All", "Pending", "Confirmed", "Completed"];

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");

  const isHost = user?.role === "host";

  const guestBookings = useGetGuestBookings({ query: { enabled: !isHost && !!user } as any });
  const hostBookings = useGetHostBookings(
    { status: filter === "All" ? undefined : filter.toLowerCase() as any },
    { query: { enabled: isHost && !!user } as any }
  );

  const { mutate: updateStatus } = useUpdateBookingStatus();

  const bookings = isHost ? hostBookings.data : guestBookings.data;
  const isLoading = isHost ? hostBookings.isLoading : guestBookings.isLoading;
  const refetch = isHost ? hostBookings.refetch : guestBookings.refetch;
  const isRefetching = isHost ? hostBookings.isRefetching : guestBookings.isRefetching;

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (isHost) return bookings; // API already filters for host
    if (filter === "All") return bookings;
    return bookings.filter(b => b.status === filter.toLowerCase());
  }, [bookings, filter, isHost]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.warning;
      case "cancelled": return colors.destructive;
      case "completed": return colors.primary;
      default: return colors.mutedForeground;
    }
  };

  const handleCancel = (id: string) => {
    updateStatus({ bookingId: id, data: { status: "cancelled" } }, {
      onSuccess: () => refetch()
    });
  };

  const openUPI = (item: any) => {
    const upiId = item.property?.upiId;
    if (!upiId) return;
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(item.property.name)}&am=${item.totalAmount}&tn=Booking%20${item.referenceNumber}&cu=INR`;
    Linking.openURL(upiUrl);
  };

  const openWhatsApp = (mobile: string, name: string, ref: string) => {
    const url = `https://wa.me/91${mobile}?text=${encodeURIComponent(`Hi ${name}, regarding booking ${ref}...`)}`;
    Linking.openURL(url);
  };

  const renderBooking = ({ item }: { item: any }) => {
    const checkIn = new Date(item.checkIn);
    const checkOut = new Date(item.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.refBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.refText, { color: colors.primary }]}>#{item.referenceNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "15" }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
            </View>
            {isHost && (
              <Pressable onPress={() => openWhatsApp(item.guestMobile, item.guestName, item.referenceNumber)}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.propertyName}>{item.property?.name}</Text>
          <Text style={styles.roomInfo}>{item.room?.name} • {item.room?.type}</Text>
          
          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>CHECK-IN</Text>
              <Text style={styles.dateValue}>{checkIn.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </View>
            <View style={styles.nightsBadge}>
              <Text style={styles.nightsText}>{nights} nights</Text>
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>CHECK-OUT</Text>
              <Text style={styles.dateValue}>{checkOut.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>₹{item.totalAmount.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: item.status === "confirmed" ? "#27AE6015" : colors.primary + "15" }]}>
              <Text style={[styles.paymentText, { color: item.status === "confirmed" ? "#27AE60" : colors.primary }]}>
                {item.status === "confirmed" ? "Paid" : "Unpaid"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {!isHost && item.status === "confirmed" && item.property?.upiId && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => openUPI(item)}>
              <Text style={styles.actionBtnTextMain}>Pay via UPI</Text>
            </Pressable>
          )}
          {item.status === "pending" && (
            <Pressable style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.destructive }]} onPress={() => handleCancel(item.id)}>
              <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Cancel Booking</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

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

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {FILTERS.map((f) => (
            <Pressable 
              key={f} 
              style={[styles.filterChip, filter === f && { backgroundColor: colors.primary }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && { color: "#fff" }]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredBookings}
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
  filterContainer: {
    marginBottom: 10,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8A7A6E",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  refBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardBody: {
    marginBottom: 16,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  roomInfo: {
    fontSize: 13,
    color: "#8A7A6E",
    marginBottom: 16,
  },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF6F1",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#8A7A6E",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  nightsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EDE4DC",
  },
  nightsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8A7A6E",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 11,
    color: "#8A7A6E",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cardActions: {
    gap: 10,
  },
  actionBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnTextMain: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    marginTop: 100,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: "#8A7A6E",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#8A7A6E",
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
