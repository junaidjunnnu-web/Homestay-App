import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetRooms, useDeleteRoom, getFullImageUrl } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Image as ExpoImage } from "expo-image";

export default function RoomsScreen() {
  const { propertyId, propertyName } = useLocalSearchParams<{ propertyId: string; propertyName: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [amenitiesModalVisible, setAmenitiesModalVisible] = useState(false);
  const [roomNotes, setRoomNotes] = useState("");
  const [cleaningStatus, setCleaningStatus] = useState<"clean" | "dirty" | "in-progress">("clean");

  const { data: rooms, isLoading, refetch, isRefetching } = useGetRooms(propertyId!);
  const { mutate: deleteRoom } = useDeleteRoom();

  const handleDelete = (id: string) => {
    Alert.alert("Delete Room", "Remove this room from your property?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteRoom({ roomId: id }, { onSuccess: () => refetch() }),
      },
    ]);
  };

  const toggleCleaningStatus = (room: any) => {
    setSelectedRoom(room);
    const statuses: ("clean" | "dirty" | "in-progress")[] = ["clean", "dirty", "in-progress"];
    const currentIndex = statuses.indexOf(room.cleaningStatus || "clean");
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    Alert.alert("Cleaning Status Updated", `${room.name} is now ${nextStatus}`);
    // In production, this would update via API
  };

  const openNotesModal = (room: any) => {
    setSelectedRoom(room);
    setRoomNotes(room.notes || "");
    setNotesModalVisible(true);
  };

  const saveNotes = () => {
    if (selectedRoom) {
      selectedRoom.notes = roomNotes;
      Alert.alert("Notes Saved", "Room notes have been updated.");
    }
    setNotesModalVisible(false);
  };

  const openAmenitiesModal = (room: any) => {
    setSelectedRoom(room);
    setAmenitiesModalVisible(true);
  };

  const viewCalendar = (room: any) => {
    router.push(`/availability/${room.id}`);
  };

  const statusColor = (status: string) => {
    if (status === "available") return colors.success;
    if (status === "occupied") return colors.warning;
    return colors.mutedForeground;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rooms</Text>
          {propertyName ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{decodeURIComponent(propertyName)}</Text>
          ) : null}
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push(`/room/add?propertyId=${propertyId}`)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={[styles.countBar, { backgroundColor: colors.surface }]}>
            <Text style={styles.countText}>{rooms?.length ?? 0} rooms listed</Text>
            <Pressable
              style={[styles.inlineAdd, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/room/add?propertyId=${propertyId}`)}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.inlineAddText}>Add Room</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="home" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No rooms yet</Text>
              <Text style={styles.emptyText}>Tap + Add Room to get started</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Room Image */}
            <View style={styles.imageSection}>
              {item.photos && item.photos.length > 0 ? (
                <ExpoImage 
                  source={{ uri: getFullImageUrl(item.photos[0]) }} 
                  style={styles.roomImage} 
                  contentFit="cover" 
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="home" size={32} color={colors.primary} />
                </View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
              </View>
            </View>

            {/* Room Info */}
            <View style={styles.infoSection}>
              <Text style={styles.roomName}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.roomMeta}>{item.type}</Text>
                <Text style={styles.metaSeparator}>·</Text>
                <Text style={styles.roomMeta}>Up to {item.capacity} guests</Text>
              </View>
              <Text style={styles.roomPrice}>
                ₹{(item.pricePerNight || 0).toLocaleString("en-IN")}
                <Text style={styles.perNight}>/night</Text>
              </Text>
              <View style={styles.cleaningRow}>
                <Ionicons 
                  name={(item as any).cleaningStatus === "clean" ? "checkmark-circle" : (item as any).cleaningStatus === "dirty" ? "close-circle" : "time"} 
                  size={14} 
                  color={(item as any).cleaningStatus === "clean" ? "#10B981" : (item as any).cleaningStatus === "dirty" ? "#EF4444" : "#F59E0B"} 
                />
                <Text style={[styles.cleaningText, { color: colors.mutedForeground }]}>
                  {(item as any).cleaningStatus || "clean"}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionSection}>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.primary }]}
                  onPress={() => viewCalendar(item)}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: "#10B981" }]}
                  onPress={() => toggleCleaningStatus(item)}
                >
                  <Feather name="refresh-cw" size={16} color="#10B981" />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: "#8B5CF6" }]}
                  onPress={() => openAmenitiesModal(item)}
                >
                  <Ionicons name="list-outline" size={16} color="#8B5CF6" />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: "#F59E0B" }]}
                  onPress={() => openNotesModal(item)}
                >
                  <Feather name="file-text" size={16} color="#F59E0B" />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.primary }]}
                  onPress={() =>
                    router.push(
                      `/room/add?propertyId=${propertyId}&roomId=${item.id}`
                    )
                  }
                >
                  <Feather name="edit-2" size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.destructive }]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Room Notes</Text>
              <Pressable onPress={() => setNotesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedRoom && (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {selectedRoom.name}
                </Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={roomNotes}
                  onChangeText={setRoomNotes}
                  placeholder="Add notes about this room..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                    onPress={() => setNotesModalVisible(false)}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                    onPress={saveNotes}
                  >
                    <Text style={styles.modalBtnText}>Save</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Amenities Modal */}
      <Modal
        visible={amenitiesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAmenitiesModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Amenities</Text>
              <Pressable onPress={() => setAmenitiesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedRoom && (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {selectedRoom.name}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  {[
                    { icon: "wifi", label: "WiFi" },
                    { icon: "tv", label: "TV" },
                    { icon: "snow", label: "AC" },
                    { icon: "droplet", label: "Hot Water" },
                    { icon: "coffee", label: "Kitchen" },
                    { icon: "car", label: "Parking" },
                    { icon: "lock", label: "Safe" },
                    { icon: "phone", label: "Room Service" },
                  ].map((amenity) => (
                    <Pressable
                      key={amenity.label}
                      style={[styles.amenityItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Ionicons name={amenity.icon as any} size={20} color={colors.primary} />
                      <Text style={[styles.amenityLabel, { color: colors.foreground }]}>{amenity.label}</Text>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setAmenitiesModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Close</Text>
                </Pressable>
              </>
            )}
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
    paddingBottom: 20,
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  countBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  countText: { fontSize: 13, fontWeight: "600", color: "#8A7A6E" },
  inlineAdd: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  inlineAddText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageSection: {
    position: "relative",
    height: 140,
  },
  roomImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  infoSection: {
    padding: 16,
  },
  roomName: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaSeparator: { marginHorizontal: 6, color: "#8A7A6E" },
  roomMeta: { fontSize: 13, color: "#8A7A6E" },
  roomPrice: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  perNight: { fontSize: 13, fontWeight: "500" },
  cleaningRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cleaningText: { fontSize: 12, fontWeight: "600" },
  actionSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalScroll: { maxHeight: 300, marginBottom: 16 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 120,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  amenityLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, color: "#8A7A6E" },
});
