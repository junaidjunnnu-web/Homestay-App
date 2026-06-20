import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHousekeepingTasks, useUpdateHousekeepingTask } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function HousekeepingScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: tasks, isLoading, refetch, isRefetching } = useGetHousekeepingTasks({
    propertyId: propertyId || undefined,
    status: statusFilter || undefined,
  });

  const { mutate: updateTask } = useUpdateHousekeepingTask();

  const toggleTaskStatus = (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "pending" : "done";
    updateTask({
      taskId,
      data: { status: nextStatus as any }
    }, {
      onSuccess: () => refetch()
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return colors.destructive;
      case "medium": return colors.warning;
      case "low": return colors.success;
      default: return colors.mutedForeground;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "cleaning": return "trash-2";
      case "maintenance": return "tool";
      default: return "clipboard";
    }
  };

  const renderTask = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => toggleTaskStatus(item.id, item.status)}
    >
      <View style={[styles.statusIcon, { borderColor: item.status === "done" ? colors.success : colors.border, backgroundColor: item.status === "done" ? colors.success : "transparent" }]}>
        {item.status === "done" && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, item.status === "done" && { textDecorationLine: "line-through", color: colors.mutedForeground }]}>
          {item.title}
        </Text>
        <View style={styles.taskMeta}>
          <Feather name={getTypeIcon(item.type) as any} size={12} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{item.type.toUpperCase()}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + "15" }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>{item.priority.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      {item.dueDate && (
        <Text style={styles.dueDate}>{new Date(item.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</Text>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Housekeeping</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {["pending", "in_progress", "done"].map(status => (
            <Pressable
              key={status}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                statusFilter === status && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setStatusFilter(statusFilter === status ? null : status)}
            >
              <Text style={[styles.filterText, statusFilter === status && { color: "#fff" }]}>
                {status.replace('_', ' ').toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="check-circle" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  filters: { marginBottom: 12 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, backgroundColor: "#fff" },
  filterText: { fontSize: 11, fontWeight: "700" },
  list: { padding: 16 },
  taskCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statusIcon: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginRight: 16, justifyContent: "center", alignItems: "center" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 10, color: "#666", fontWeight: "700" },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: "800" },
  dueDate: { fontSize: 12, color: "#999", fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 100, gap: 16 },
  emptyText: { fontSize: 16, color: "#666" },
});
