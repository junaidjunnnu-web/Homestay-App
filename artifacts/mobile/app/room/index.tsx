import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetRooms, useDeleteRoom } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function RoomsScreen() {
  const { propertyId, propertyName } = useLocalSearchParams<{ propertyId: string; propertyName: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
            <View style={styles.cardLeft}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
              <View style={styles.info}>
                <Text style={styles.roomName}>{item.name}</Text>
                <Text style={styles.roomMeta}>{item.type} · Up to {item.capacity} guests</Text>
                <Text style={styles.roomPrice}>
                  ₹{item.pricePerNight.toLocaleString("en-IN")}
                  <Text style={styles.perNight}>/night</Text>
                </Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.primary }]}
                  onPress={() =>
                    router.push(
                      `/room/add?propertyId=${propertyId}&roomId=${item.id}`
                    )
                  }
                >
                  <Feather name="edit-2" size={14} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.destructive }]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardLeft: { flexDirection: "row", gap: 12, flex: 1, alignItems: "center" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  roomMeta: { fontSize: 12, color: "#8A7A6E", marginBottom: 6 },
  roomPrice: { fontSize: 15, fontWeight: "800" },
  perNight: { fontSize: 11, fontWeight: "400" },
  cardRight: { alignItems: "flex-end", gap: 8, flexShrink: 0, marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, color: "#8A7A6E" },
});
