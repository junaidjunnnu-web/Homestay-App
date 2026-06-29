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
import { useGetHousekeepingTasks, useUpdateHousekeepingTask } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";

export default function HousekeepingScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskPhotos, setTaskPhotos] = useState<string[]>([]);

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

  const openTaskModal = () => {
    setNewTaskTitle("");
    setNewTaskPriority("medium");
    setTaskModalVisible(true);
  };

  const addNewTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }
    Alert.alert("Task Added", "New housekeeping task has been created.");
    setTaskModalVisible(false);
    // In production, this would call an API to create the task
  };

  const openPhotoModal = (task: any) => {
    setSelectedTask(task);
    setTaskPhotos((task as any).photos || []);
    setPhotoModalVisible(true);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please grant camera roll permissions to upload photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setTaskPhotos([...taskPhotos, result.assets[0].uri]);
    }
  };

  const saveTaskPhotos = () => {
    if (selectedTask) {
      (selectedTask as any).photos = taskPhotos;
      Alert.alert("Photos Saved", "Task photos have been updated.");
    }
    setPhotoModalVisible(false);
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
      <View style={styles.taskActions}>
        <Pressable
          style={[styles.taskActionBtn, { backgroundColor: "#8B5CF6" }]}
          onPress={() => openPhotoModal(item)}
        >
          <Ionicons name="camera" size={14} color="#fff" />
        </Pressable>
        {item.dueDate && (
          <Text style={styles.dueDate}>{new Date(item.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Housekeeping</Text>
        <Pressable style={styles.addTaskBtn} onPress={openTaskModal}>
          <Ionicons name="add" size={24} color="#000" />
        </Pressable>
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

      {/* Add Task Modal */}
      <Modal visible={taskModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Task</Text>
              <Pressable onPress={() => setTaskModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="e.g. Clean Room 101"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityPicker}>
                {(["low", "medium", "high"] as const).map((priority) => (
                  <Pressable
                    key={priority}
                    style={[
                      styles.priorityOption,
                      { borderColor: colors.border },
                      newTaskPriority === priority && { backgroundColor: getPriorityColor(priority), borderColor: getPriorityColor(priority) }
                    ]}
                    onPress={() => setNewTaskPriority(priority)}
                  >
                    <Text style={[styles.priorityOptionText, newTaskPriority === priority && { color: "#fff" }]}>
                      {priority.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={addNewTask}
            >
              <Text style={styles.submitBtnText}>Add Task</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Photo Modal */}
      <Modal visible={photoModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Photos</Text>
              <Pressable onPress={() => setPhotoModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            {selectedTask && (
              <>
                <Text style={styles.modalSubtitle}>{selectedTask.title}</Text>
                <ScrollView style={styles.photosScroll}>
                  {taskPhotos.map((photo, i) => (
                    <View key={i} style={styles.photoItem}>
                      <View style={[styles.photoPlaceholder, { backgroundColor: colors.border }]} />
                      <Pressable
                        style={styles.removePhotoBtn}
                        onPress={() => setTaskPhotos(taskPhotos.filter((_, idx) => idx !== i))}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    style={[styles.addPhotoBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={pickPhoto}
                  >
                    <Ionicons name="add" size={24} color={colors.primary} />
                    <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text>
                  </Pressable>
                </ScrollView>
                <Pressable
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={saveTaskPhotos}
                >
                  <Text style={styles.submitBtnText}>Save Photos</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  addTaskBtn: { padding: 8 },
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
  taskActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskActionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  dueDate: { fontSize: 12, color: "#999", fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 100, gap: 16 },
  emptyText: { fontSize: 16, color: "#666" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 13, color: "#8A7A6E", marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "700", color: "#8A7A6E", marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  priorityPicker: {
    flexDirection: "row",
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityOptionText: { fontSize: 13, fontWeight: "700" },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  photosScroll: { maxHeight: 200, marginBottom: 16 },
  photoItem: {
    width: 100,
    height: 100,
    marginBottom: 12,
    marginRight: 12,
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  addPhotoText: { fontSize: 14, fontWeight: "700" },
});
