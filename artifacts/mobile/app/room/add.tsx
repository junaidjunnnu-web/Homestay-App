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
import { useCreateRoom, useUpdateRoom, useGetRoom, getFullImageUrl } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import { uploadImage } from "@/utils/uploadImage";

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Cottage", "Dormitory", "Family"];
const STATUSES = ["available", "occupied", "maintenance"] as const;
const ROOM_AMENITIES = ["AC", "Hot Water", "TV", "Balcony", "WiFi", "Mini Fridge", "Attached Bath"];

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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "Standard",
    pricePerNight: "",
    capacity: "2",
    status: "available" as "available" | "occupied" | "maintenance",
    photos: [] as string[],
    amenities: [] as string[],
    description: "",
  });

  React.useEffect(() => {
    if (existingRoom) {
      setForm({
        name: existingRoom.name || "",
        type: existingRoom.type || "Standard",
        pricePerNight: String(existingRoom.pricePerNight || ""),
        capacity: String(existingRoom.capacity || 2),
        status: (existingRoom.status as "available" | "occupied" | "maintenance") || "available",
        photos: (existingRoom as any).photos || [],
        amenities: (existingRoom as any).amenities || [],
        description: (existingRoom as any).description || "",
      });
    }
  }, [existingRoom]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const url = await uploadImage(result.assets[0].uri);
        setForm(prev => ({ ...prev, photos: [...prev.photos, url] }));
      } catch {
        Alert.alert("Upload Failed", "Could not upload image. Please try again.");
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.pricePerNight || !form.capacity) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    const price = parseFloat(form.pricePerNight);
    const cap = parseInt(form.capacity);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return;
    }

    const payload = {
      name: form.name,
      type: form.type,
      pricePerNight: price,
      capacity: cap,
      photos: form.photos,
      amenities: form.amenities,
      description: form.description,
    };

    if (isEditing) {
      updateRoom(
        { roomId: roomId!, data: { ...payload, status: form.status } },
        {
          onSuccess: () => { Alert.alert("Success", "Room updated"); router.back(); },
          onError: () => Alert.alert("Error", "Failed to update room."),
        }
      );
    } else {
      createRoom(
        { propertyId: propertyId!, data: payload },
        {
          onSuccess: () => { Alert.alert("Success", "Room added successfully!"); router.back(); },
          onError: () => Alert.alert("Error", "Failed to add room."),
        }
      );
    }
  };

  const isBusy = isCreating || isUpdating;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.primary }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? "Edit Room" : "Add Room"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Photos */}
        <Text style={styles.sectionLabel}>ROOM PHOTOS</Text>
        <View style={styles.photosRow}>
          {form.photos.map((uri, index) => (
            <View key={index} style={styles.photoWrapper}>
              <ExpoImage source={{ uri: getFullImageUrl(uri) }} style={styles.photoThumb} contentFit="cover" />
              <Pressable style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                <Ionicons name="close-circle" size={20} color="#E53E3E" />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={[styles.addPhotoBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}
            onPress={pickPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Basic Info */}
        <Text style={styles.sectionLabel}>ROOM DETAILS</Text>

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
                { borderColor: colors.border, backgroundColor: colors.surface },
                form.type === type && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setForm({ ...form, type })}
            >
              <Text style={[styles.chipText, form.type === type && { color: "#fff" }]}>{type}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { height: 80, backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
          multiline
          placeholder="Describe the room view, features..."
          placeholderTextColor={colors.mutedForeground}
        />

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

        {/* Room Amenities */}
        <Text style={styles.sectionLabel}>ROOM AMENITIES</Text>
        <View style={styles.chipGrid}>
          {ROOM_AMENITIES.map(amenity => (
            <Pressable
              key={amenity}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                form.amenities.includes(amenity) && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => toggleAmenity(amenity)}
            >
              <Text style={[styles.chipText, form.amenities.includes(amenity) && { color: "#fff" }]}>{amenity}</Text>
            </Pressable>
          ))}
        </View>

        {isEditing && (
          <>
            <Text style={styles.sectionLabel}>ROOM STATUS</Text>
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
                      { borderColor: active ? col : colors.border, backgroundColor: colors.surface },
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
          style={[styles.submitButton, { backgroundColor: colors.primary }, isBusy && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isBusy}
        >
          {isBusy ? (
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  content: { padding: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1.2,
    marginBottom: 14,
    marginTop: 20,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#444" },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 16 },
  textArea: { paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  halfField: { flex: 1 },
  photosRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  photoWrapper: { position: "relative" },
  photoThumb: { width: 90, height: 90, borderRadius: 12 },
  removePhotoBtn: { position: "absolute", top: -6, right: -6 },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addPhotoText: { fontSize: 11, fontWeight: "700" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  submitButton: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 12 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
