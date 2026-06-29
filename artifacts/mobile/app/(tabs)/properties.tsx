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
import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostProperties, useDeleteProperty, getFullImageUrl } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Image as ExpoImage } from "expo-image";

export default function PropertiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: properties, isLoading, refetch, isRefetching } = useGetHostProperties();
  const { mutate: deleteProperty } = useDeleteProperty();

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Property", `Remove "${name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteProperty({ propertyId: id }, { onSuccess: () => refetch() }),
      },
    ]);
  };

  const renderProperty = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardMain}>
        {item.photos && item.photos.length > 0 ? (
          <ExpoImage source={{ uri: getFullImageUrl(item.photos[0]) }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="home" size={24} color={colors.mutedForeground} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={styles.locationText} numberOfLines={1}>{item.city}, {item.state}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                {item.rooms?.length || 0} Rooms
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
                {item.bookingMode === "instant" ? "⚡ Instant" : "📋 Inquiry"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
          onPress={() =>
            router.push(`/room?propertyId=${item.id}&propertyName=${encodeURIComponent(item.name)}`)
          }
        >
          <Feather name="home" size={13} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Rooms</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: colors.border }]}
          onPress={() => router.push(`/property/add?id=${item.id}`)}
        >
          <Feather name="edit-2" size={13} color="#444" />
          <Text style={[styles.actionBtnText, { color: "#444" }]}>Edit</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: colors.destructive }]}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Feather name="trash-2" size={13} color={colors.destructive} />
          <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.title}>My Properties</Text>
          <Text style={styles.subtitle}>{properties?.length || 0} listed</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => router.push("/property/add")}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="home" size={56} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No properties yet</Text>
              <Text style={styles.emptyText}>Tap Add to list your first property</Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/property/add")}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Add Property</Text>
              </Pressable>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    gap: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { padding: 16, paddingBottom: 120 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardMain: { flexDirection: "row", gap: 12, padding: 14 },
  thumbnail: { width: 80, height: 80, borderRadius: 12 },
  thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  locationText: { fontSize: 12, color: "#8A7A6E" },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0ebe5",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800" },
  emptyText: { fontSize: 14, color: "#8A7A6E" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
