import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { useCreateRoom, useUpdateRoom, useGetRoom } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Cottage", "Dormitory"];
const STATUSES = ["available", "occupied", "maintenance"] as const;

export default function AddRoomScreen() {
  const { propertyId, roomId } = useLocalSearchParams<{ propertyId: string; roomId?: string }>();
  const isEditing = !!roomId;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: existingRoom } = useGetRoom(roomId!, {
    query: { enabled: isEditing } as any,
  });

  const { mutate: createRoom, isPending: isCreating } = useCreateRoom();
  const { mutate: updateRoom, isPending: isUpdating } = useUpdateRoom();

  const [form, setForm] = useState({
    name: "",
    type: "Standard",
    pricePerNight: "",
    capacity: "2",
    status: "available" as "available" | "occupied" | "maintenance",
  });

  React.useEffect(() => {
    if (existingRoom) {
      setForm({
        name: existingRoom.name || "",
        type: existingRoom.type || "Standard",
        pricePerNight: String(existingRoom.pricePerNight || ""),
        capacity: String(existingRoom.capacity || 2),
        status: (existingRoom.status as "available" | "occupied" | "maintenance") || "available",
      });
    }
  }, [existingRoom]);

  const handleSubmit = () => {
    if (!form.name || !form.pricePerNight || !form.capacity) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    const price = parseFloat(form.pricePerNight);
    const cap = parseInt(form.capacity);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return;
    }

    if (isEditing) {
      updateRoom(
        { roomId: roomId!, data: { name: form.name, type: form.type, pricePerNight: price, capacity: cap, status: form.status } },
        {
          onSuccess: () => { Alert.alert("Success", "Room updated"); router.back(); },
          onError: () => Alert.alert("Error", "Failed to update room."),
        }
      );
    } else {
      createRoom(
        { propertyId: propertyId!, data: { name: form.name, type: form.type, pricePerNight: price, capacity: cap } },
        {
          onSuccess: () => { Alert.alert("Success", "Room added"); router.back(); },
          onError: () => Alert.alert("Error", "Failed to add room."),
        }
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? "Edit Room" : "Add Room"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Room Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
          placeholder="e.g. Garden View Room"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Room Type</Text>
        <View style={styles.chipGrid}>
          {ROOM_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.chip,
                { borderColor: colors.border },
                form.type === type && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setForm({ ...form, type })}
            >
              <Text style={[styles.chipText, form.type === type && { color: "#fff" }]}>{type}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Price / Night (₹) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.pricePerNight}
              onChangeText={(text) => setForm({ ...form, pricePerNight: text })}
              keyboardType="numeric"
              placeholder="e.g. 2500"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={styles.halfField}>
            <Text style={styles.label}>Max Guests *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.capacity}
              onChangeText={(text) => setForm({ ...form, capacity: text })}
              keyboardType="numeric"
              placeholder="e.g. 2"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        {isEditing && (
          <>
            <Text style={styles.label}>Room Status</Text>
            <View style={styles.chipGrid}>
              {STATUSES.map((status) => {
                const col =
                  status === "available" ? colors.success :
                  status === "occupied" ? colors.warning :
                  colors.mutedForeground;
                const active = form.status === status;
                return (
                  <Pressable
                    key={status}
                    style={[
                      styles.chip,
                      { borderColor: active ? col : colors.border },
                      active && { backgroundColor: col },
                    ]}
                    onPress={() => setForm({ ...form, status })}
                  >
                    <Text style={[styles.chipText, active && { color: "#fff" }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.primary }, (isCreating || isUpdating) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.submitInner}>
              <Feather name={isEditing ? "check" : "plus"} size={20} color="#fff" />
              <Text style={styles.submitButtonText}>{isEditing ? "Update Room" : "Add Room"}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ height: 60 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#444" },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 20 },
  row: { flexDirection: "row" },
  halfField: { flex: 1 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  submitButton: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 12 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
