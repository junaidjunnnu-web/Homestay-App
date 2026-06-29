import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
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
import { useGetHostBookings } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";

export default function GuestRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [vipModalVisible, setVipModalVisible] = useState(false);
  const [idPhotoModalVisible, setIdPhotoModalVisible] = useState(false);
  const [selectedIdPhoto, setSelectedIdPhoto] = useState<string | null>(null);

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
          isVip: (b.totalAmount || 0) > 50000, // Auto-mark as VIP if spent > 50k
          idPhoto: null,
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

  const toggleVipStatus = (guest: any) => {
    setSelectedGuest(guest);
    setVipModalVisible(true);
  };

  const confirmVipToggle = () => {
    if (selectedGuest) {
      selectedGuest.isVip = !selectedGuest.isVip;
      Alert.alert("VIP Status Updated", `${selectedGuest.name} is now ${selectedGuest.isVip ? "a VIP guest" : "no longer VIP"}`);
    }
    setVipModalVisible(false);
  };

  const uploadIdPhoto = async (guest: any) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedGuest(guest);
      setSelectedIdPhoto(result.assets[0].uri);
      setIdPhotoModalVisible(true);
    }
  };

  const saveIdPhoto = () => {
    if (selectedGuest && selectedIdPhoto) {
      selectedGuest.idPhoto = selectedIdPhoto;
      Alert.alert("ID Photo Saved", "Guest ID proof has been updated.");
    }
    setIdPhotoModalVisible(false);
    setSelectedIdPhoto(null);
  };

  const viewGuestHistory = (guest: any) => {
    setSelectedGuest(guest);
    setHistoryModalVisible(true);
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
        <View style={[styles.avatar, { backgroundColor: item.isVip ? "#FFD70020" : colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: item.isVip ? "#FFD700" : colors.primary }]}>
            {(item.name || "G").charAt(0).toUpperCase()}
          </Text>
          {item.isVip && (
            <View style={styles.vipBadge}>
              <Ionicons name="star" size={10} color="#FFD700" />
            </View>
          )}
        </View>
        <View style={styles.guestInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.guestName}>{item.name}</Text>
            {item.isVip && (
              <View style={[styles.vipPill, { backgroundColor: "#FFD70020" }]}>
                <Ionicons name="star" size={10} color="#FFD700" />
                <Text style={[styles.vipText, { color: "#FFD700" }]}>VIP</Text>
              </View>
            )}
          </View>
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
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
            onPress={() => viewGuestHistory(item)}
          >
            <Feather name="clock" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>History</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: item.isVip ? "#FFD700" : "#E8824A" }]}
            onPress={() => toggleVipStatus(item)}
          >
            <Ionicons name={item.isVip ? "star" : "star-outline"} size={14} color="#fff" />
            <Text style={styles.actionBtnText}>{item.isVip ? "VIP" : "Mark VIP"}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
            onPress={() => uploadIdPhoto(item)}
          >
            <Ionicons name="camera-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>ID Photo</Text>
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

      {/* Guest History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Guest History</Text>
              <Pressable onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedGuest && (
              <ScrollView style={styles.modalScroll}>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {selectedGuest.name} · {selectedGuest.bookings.length} bookings
                </Text>
                {selectedGuest.bookings.map((b: any) => (
                  <View key={b.id} style={[styles.historyItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={styles.historyRef}>#{b.referenceNumber || 'N/A'}</Text>
                    <Text style={styles.historyProp}>{b.property?.name || 'N/A'}</Text>
                    <Text style={[styles.historyDates, { color: colors.mutedForeground }]}>
                      {b.checkIn} → {b.checkOut}
                    </Text>
                    <Text style={[styles.historyAmount, { color: colors.foreground }]}>
                      ₹{(b.totalAmount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* VIP Toggle Modal */}
      <Modal
        visible={vipModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setVipModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>VIP Status</Text>
              <Pressable onPress={() => setVipModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedGuest && (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {selectedGuest.isVip ? "Remove VIP status from" : "Mark as VIP guest"}
                </Text>
                <Text style={[styles.guestNameLarge, { color: colors.foreground }]}>{selectedGuest.name}</Text>
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                    onPress={() => setVipModalVisible(false)}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: "#FFD700" }]}
                    onPress={confirmVipToggle}
                  >
                    <Text style={[styles.modalBtnText, { color: "#000" }]}>Confirm</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ID Photo Modal */}
      <Modal
        visible={idPhotoModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIdPhotoModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>ID Photo</Text>
              <Pressable onPress={() => setIdPhotoModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedIdPhoto && (
              <ExpoImage source={{ uri: selectedIdPhoto }} style={styles.idPhotoPreview} contentFit="cover" />
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setIdPhotoModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveIdPhoto}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  vipBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFD700",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  guestInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  guestName: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  vipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  vipText: { fontSize: 10, fontWeight: "700" },
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, color: "#8A7A6E", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalScroll: { maxHeight: 300 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyRef: { fontSize: 11, fontWeight: "700", color: "#8A7A6E", width: 60 },
  historyProp: { flex: 1, fontSize: 14, fontWeight: "600" },
  historyDates: { fontSize: 11, width: 90 },
  historyAmount: { fontSize: 14, fontWeight: "700" },
  guestNameLarge: { fontSize: 24, fontWeight: "800", textAlign: "center", marginVertical: 20 },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  idPhotoPreview: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
});
