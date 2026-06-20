import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateRoom } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Cottage"];

export default function AddRoomScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { mutate: createRoom, isPending } = useCreateRoom();

  const [form, setForm] = useState({
    name: "",
    type: "Standard",
    pricePerNight: "",
    capacity: "2",
  });

  const handleSubmit = () => {
    if (!form.name || !form.pricePerNight || !form.capacity) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    createRoom({
      propertyId: propertyId!,
      data: {
        name: form.name,
        type: form.type,
        pricePerNight: parseFloat(form.pricePerNight),
        capacity: parseInt(form.capacity),
      }
    }, {
      onSuccess: () => {
        Alert.alert("Success", "Room added successfully");
        router.back();
      }
    });
  };

  return (
    <KeyboardAwareScrollViewCompat style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Room</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Room Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.name}
          onChangeText={text => setForm({ ...form, name: text })}
          placeholder="e.g. Garden View Room"
        />

        <Text style={styles.label}>Room Type</Text>
        <View style={styles.typesGrid}>
          {ROOM_TYPES.map(type => (
            <Pressable
              key={type}
              style={[
                styles.typeChip,
                { borderColor: colors.border },
                form.type === type && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setForm({ ...form, type })}
            >
              <Text style={[styles.typeText, form.type === type && { color: "#fff" }]}>{type}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Price Per Night (₹)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.pricePerNight}
          onChangeText={text => setForm({ ...form, pricePerNight: text })}
          keyboardType="numeric"
          placeholder="e.g. 2500"
        />

        <Text style={styles.label}>Capacity (Guests)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.capacity}
          onChangeText={text => setForm({ ...form, capacity: text })}
          keyboardType="numeric"
          placeholder="e.g. 2"
        />

        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Room</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#444" },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16, marginBottom: 16 },
  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  typeText: { fontSize: 13, fontWeight: "600" },
  submitButton: { height: 56, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
