import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetBookingByReference } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function TrackBookingScreen() {
  const [ref, setRef] = useState("");
  const [searchRef, setSearchRef] = useState("");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: booking, isLoading, error } = useGetBookingByReference(searchRef, {
    query: { enabled: !!searchRef } as any
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.warning;
      case "cancelled": return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Track Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.label}>Enter Reference Number</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { borderColor: colors.border }]}
              placeholder="e.g. HS-123456"
              value={ref}
              onChangeText={setRef}
              autoCapitalize="characters"
            />
            <Pressable
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={() => setSearchRef(ref)}
            >
              <Feather name="search" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {isLoading && (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Could not find a booking with that reference.</Text>
          </View>
        )}

        {booking && (
          <View style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.refLabel}>Booking Reference</Text>
                <Text style={styles.refValue}>{booking.referenceNumber}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + "20" }]}>
                <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                  {booking.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Feather name="home" size={16} color={colors.mutedForeground} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Property</Text>
                <Text style={styles.detailValue}>{booking.property?.name}</Text>
                <Text style={styles.detailSub}>{booking.room?.name}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Feather name="calendar" size={16} color={colors.mutedForeground} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Dates</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Guest</Text>
                <Text style={styles.detailValue}>{booking.guestName}</Text>
                <Text style={styles.detailSub}>{booking.guestCount} guests</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{booking.totalAmount.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  searchBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#666",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    marginTop: 40,
  },
  errorBox: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#e74c3c",
    textAlign: "center",
  },
  bookingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  refLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  refValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
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
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailSub: {
    fontSize: 13,
    color: "#666",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B6B5A",
  },
});
