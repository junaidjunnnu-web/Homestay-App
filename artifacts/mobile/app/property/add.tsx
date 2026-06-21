import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useCreateProperty, useUpdateProperty, useGetProperty } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "@/utils/uploadImage";

const AMENITIES = ["WiFi", "Parking", "Pool", "AC", "Laundry", "Restaurant", "Kitchen", "Gym", "Garden", "Hot Water", "TV", "Generator"];

export default function AddPropertyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: existingProperty } = useGetProperty(id!, { query: { enabled: isEditing } as any });
  const { mutate: createProperty, isPending: isCreating } = useCreateProperty();
  const { mutate: updateProperty, isPending: isUpdating } = useUpdateProperty();

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    description: "",
    phone: "",
    bookingMode: "instant" as "instant" | "inquiry",
    amenities: [] as string[],
    mealsIncluded: false,
    upiId: "",
    cancellationPolicy: "",
    photos: [] as string[],
  });

  React.useEffect(() => {
    if (existingProperty) {
      setForm({
        name: existingProperty.name || "",
        address: existingProperty.address || "",
        city: existingProperty.city || "",
        state: existingProperty.state || "",
        description: existingProperty.description || "",
        phone: (existingProperty as any).phone || "",
        bookingMode: existingProperty.bookingMode || "instant",
        amenities: existingProperty.amenities || [],
        mealsIncluded: existingProperty.mealsIncluded || false,
        upiId: existingProperty.upiId || "",
        cancellationPolicy: existingProperty.cancellationPolicy || "",
        photos: existingProperty.photos || [],
      });
    }
  }, [existingProperty]);

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

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
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const url = await uploadImage(result.assets[0].uri);
        setForm(prev => ({ ...prev, photos: [...prev.photos, url] }));
      } catch (e) {
        Alert.alert("Upload Failed", "Could not upload image. Please try again.");
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.city || !form.state || !form.address) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    const payload = { data: form };

    if (isEditing) {
      updateProperty({ propertyId: id!, ...payload }, {
        onSuccess: () => {
          Alert.alert("Success", "Property updated successfully");
          router.back();
        },
        onError: () => Alert.alert("Error", "Failed to update property"),
      });
    } else {
      createProperty(payload, {
        onSuccess: () => {
          Alert.alert("Success", "Property created successfully! Add rooms next.");
          router.back();
        },
        onError: () => Alert.alert("Error", "Failed to create property"),
      });
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
        <Text style={styles.headerTitle}>{isEditing ? "Edit Property" : "Add Property"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Photos Section */}
        <Text style={styles.sectionLabel}>PROPERTY PHOTOS</Text>
        <View style={styles.photosRow}>
          {form.photos.map((uri, index) => (
            <View key={index} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photoThumb} />
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
        <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>

        <Text style={styles.label}>Property Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.name}
          onChangeText={text => setForm({ ...form, name: text })}
          placeholder="e.g. Mountain View Cottage"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.address}
          onChangeText={text => setForm({ ...form, address: text })}
          multiline
          placeholder="Full address"
          placeholderTextColor={colors.mutedForeground}
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.city}
              onChangeText={text => setForm({ ...form, city: text })}
              placeholder="e.g. Coorg"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.state}
              onChangeText={text => setForm({ ...form, state: text })}
              placeholder="e.g. Karnataka"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        <Text style={styles.label}>Contact Phone / WhatsApp</Text>
        <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="phone" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inputInner}
            value={form.phone}
            onChangeText={text => setForm({ ...form, phone: text })}
            placeholder="e.g. 9876543210"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.description}
          onChangeText={text => setForm({ ...form, description: text })}
          multiline
          placeholder="Tell guests about your place, surroundings, experience..."
          placeholderTextColor={colors.mutedForeground}
        />

        {/* Settings */}
        <Text style={styles.sectionLabel}>BOOKING SETTINGS</Text>

        <Text style={styles.label}>Booking Mode</Text>
        <View style={styles.roleSelector}>
          <Pressable
            style={[
              styles.roleBtn,
              { borderColor: colors.border },
              form.bookingMode === "instant" && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setForm({ ...form, bookingMode: "instant" })}
          >
            <Ionicons name="flash" size={16} color={form.bookingMode === "instant" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.roleBtnText, form.bookingMode === "instant" ? { color: "#fff" } : { color: colors.mutedForeground }]}>Instant</Text>
          </Pressable>
          <Pressable
            style={[
              styles.roleBtn,
              { borderColor: colors.border },
              form.bookingMode === "inquiry" && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setForm({ ...form, bookingMode: "inquiry" })}
          >
            <Ionicons name="chatbubble-outline" size={16} color={form.bookingMode === "inquiry" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.roleBtnText, form.bookingMode === "inquiry" ? { color: "#fff" } : { color: colors.mutedForeground }]}>Inquiry</Text>
          </Pressable>
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Meals Included</Text>
            <Text style={styles.sublabel}>Breakfast / full board offered</Text>
          </View>
          <Pressable
            style={[styles.switch, { backgroundColor: form.mealsIncluded ? colors.primary : colors.muted }]}
            onPress={() => setForm({ ...form, mealsIncluded: !form.mealsIncluded })}
          >
            <View style={[styles.switchThumb, { transform: [{ translateX: form.mealsIncluded ? 22 : 2 }] }]} />
          </Pressable>
        </View>

        <Text style={styles.label}>Cancellation Policy</Text>
        <TextInput
          style={[styles.input, styles.textArea, { height: 80, backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.cancellationPolicy}
          onChangeText={text => setForm({ ...form, cancellationPolicy: text })}
          multiline
          placeholder="e.g. Free cancellation 48 hours before check-in"
          placeholderTextColor={colors.mutedForeground}
        />

        {/* Amenities */}
        <Text style={styles.sectionLabel}>AMENITIES</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITIES.map(amenity => (
            <Pressable
              key={amenity}
              style={[
                styles.amenityChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                form.amenities.includes(amenity) && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => toggleAmenity(amenity)}
            >
              <Text style={[styles.amenityText, form.amenities.includes(amenity) && { color: "#fff" }]}>{amenity}</Text>
            </Pressable>
          ))}
        </View>

        {/* Payment */}
        <Text style={styles.sectionLabel}>PAYMENT</Text>
        <Text style={styles.label}>UPI ID (for guest payments)</Text>
        <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="credit-card" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inputInner}
            value={form.upiId}
            onChangeText={text => setForm({ ...form, upiId: text })}
            placeholder="e.g. owner@upi"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
        </View>

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
              <Text style={styles.submitButtonText}>{isEditing ? "Update Property" : "Create Property"}</Text>
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
    marginTop: 24,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#444" },
  sublabel: { fontSize: 12, color: "#8A7A6E", marginTop: 2, marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 16 },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: "top" },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputInner: { flex: 1, fontSize: 16 },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
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
  roleSelector: { flexDirection: "row", gap: 12, marginBottom: 24 },
  roleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  roleBtnText: { fontWeight: "600", fontSize: 14 },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  amenityChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  amenityText: { fontSize: 12, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  switch: { width: 50, height: 28, borderRadius: 14, justifyContent: "center" },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff" },
  submitButton: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 20 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
