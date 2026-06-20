import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostProperties, useUpdateProperty } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function ManagePropertiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: properties, isLoading, refetch, isRefetching } = useGetHostProperties();
  const { mutate: updateProperty } = useUpdateProperty();

  const toggleStatus = (id: string, currentStatus: string) => {
    updateProperty({
      propertyId: id,
      data: { status: currentStatus === "active" ? "inactive" : "active" }
    }, {
      onSuccess: () => refetch()
    });
  };

  const renderProperty = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardContent}>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.city}>{item.city}</Text>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: colors.primary + "10" }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {item.bookingMode === "instant" ? "Instant Book" : "Inquiry Only"}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.muted }]}>
              <Text style={styles.tagText}>{item.rooms?.length || 0} Rooms</Text>
            </View>
          </View>
        </View>
        <View style={styles.controls}>
          <Switch
            value={item.status === "active"}
            onValueChange={() => toggleStatus(item.id, item.status)}
            trackColor={{ false: colors.muted, true: colors.primary }}
          />
          <Text style={[styles.statusLabel, { color: item.status === "active" ? colors.success : colors.mutedForeground }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Pressable style={styles.footerBtn} onPress={() => router.push(`/property/add?id=${item.id}`)}>
          <Feather name="edit-2" size={16} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>Edit</Text>
        </Pressable>
        <Pressable style={styles.footerBtn} onPress={() => router.push(`/housekeeping?propertyId=${item.id}`)}>
          <Feather name="check-square" size={16} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>Housekeeping</Text>
        </Pressable>
        <Pressable style={styles.footerBtn} onPress={() => router.push(`/room/add?propertyId=${item.id}`)}>
          <Feather name="plus-circle" size={16} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>Add Room</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Properties</Text>
      </View>

      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="home" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>You haven't added any properties yet</Text>
            </View>
          )
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: 20 + insets.bottom }]}
        onPress={() => router.push("/property/add")}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
    justifyContent: "space-between",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  city: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  tags: {
    flexDirection: "row",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  controls: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fafafa",
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: "#eee",
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  empty: {
    alignItems: "center",
    marginTop: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});
