import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostBookings } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function GuestRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: bookings, isLoading, refetch, isRefetching } = useGetHostBookings({});

  const guests = React.useMemo(() => {
    if (!bookings) return [];
    const map = new Map<string, any>();
    for (const b of bookings) {
      const key = b.guestEmail || b.guestName || b.id;
      if (!map.has(key)) {
        map.set(key, {
          name: b.guestName || "Guest",
          email: b.guestEmail || "",
          mobile: b.guestMobile || "",
          bookings: [],
          lastStay: b.checkIn,
          totalSpent: 0,
        });
      }
      const guest = map.get(key);
      guest.bookings.push(b);
      guest.totalSpent += b.totalAmount || 0;
      if (new Date(b.checkIn) > new Date(guest.lastStay)) {
        guest.lastStay = b.checkIn;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastStay).getTime() - new Date(a.lastStay).getTime()
    );
  }, [bookings]);

  const filtered = guests.filter(
    g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase()) ||
      g.mobile.includes(search)
  );

  const callGuest = (mobile: string) => {
    if (!mobile) return;
    Linking.openURL(`tel:+91${mobile}`);
  };

  const whatsappGuest = (mobile: string, name: string) => {
    if (!mobile) return;
    const msg = `Hi ${name}, this is regarding your stay with us. Please let us know if you need any assistance.`;
    Linking.openURL(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.warning;
      case "cancelled": return colors.destructive;
      default: return colors.primary;
    }
  };

  const renderGuest = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(item.name || "G").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>{item.name}</Text>
          {item.email ? <Text style={styles.guestEmail}>{item.email}</Text> : null}
          {item.mobile ? (
            <Text style={[styles.guestEmail, { color: colors.mutedForeground }]}>
              +91 {item.mobile}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{item.bookings.length} stay{item.bookings.length !== 1 ? "s" : ""}</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>₹{item.totalSpent.toLocaleString("en-IN")} total</Text>
          </View>
        </View>
      </View>

      {item.bookings.slice(0, 2).map((b: any) => (
        <View key={b.id} style={[styles.bookingRow, { borderColor: colors.border }]}>
          <Text style={styles.bookingRef}>#{b.referenceNumber}</Text>
          <View style={styles.bookingMid}>
            <Text style={styles.bookingProp} numberOfLines={1}>{b.property?.name || b.room?.name || "—"}</Text>
            <Text style={[styles.bookingDates, { color: colors.mutedForeground }]}>
              {b.checkIn} → {b.checkOut}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(b.status) + "15" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(b.status) }]}>{b.status}</Text>
          </View>
        </View>
      ))}

      {item.mobile ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
            onPress={() => whatsappGuest(item.mobile, item.name)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => callGuest(item.mobile)}
          >
            <Feather name="phone" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Call</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Guest Register</Text>
          <Text style={styles.headerSub}>{guests.length} unique guest{guests.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email or phone..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="users" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>{search ? "No results" : "No guests yet"}</Text>
              <Text style={styles.emptyText}>
                {search ? "Try a different search term" : "Guest data appears once bookings are made"}
              </Text>
            </View>
          )
        }
        renderItem={renderGuest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "800" },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  guestEmail: { fontSize: 12, color: "#8A7A6E", marginBottom: 2 },
  statsRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 },
  statText: { fontSize: 12, fontWeight: "600", color: "#8A7A6E" },
  statDot: { color: "#8A7A6E" },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  bookingRef: { fontSize: 10, fontWeight: "700", color: "#8A7A6E", width: 55 },
  bookingMid: { flex: 1 },
  bookingProp: { fontSize: 13, fontWeight: "600" },
  bookingDates: { fontSize: 11, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, color: "#8A7A6E", textAlign: "center" },
});
