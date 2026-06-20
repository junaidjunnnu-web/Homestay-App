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
import { useCreateProperty, useUpdateProperty, useGetProperty } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const AMENITIES = ["WiFi", "Parking", "Pool", "AC", "Laundry", "Restaurant", "Kitchen"];

export default function AddPropertyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: existingProperty } = useGetProperty(id!, { query: { enabled: isEditing } as any });
  const { mutate: createProperty, isPending: isCreating } = useCreateProperty();
  const { mutate: updateProperty, isPending: isUpdating } = useUpdateProperty();

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    description: "",
    bookingMode: "instant" as "instant" | "inquiry",
    amenities: [] as string[],
    mealsIncluded: false,
    upiId: "",
    cancellationPolicy: "",
  });

  React.useEffect(() => {
    if (existingProperty) {
      setForm({
        name: existingProperty.name || "",
        address: existingProperty.address || "",
        city: existingProperty.city || "",
        state: existingProperty.state || "",
        description: existingProperty.description || "",
        bookingMode: existingProperty.bookingMode || "instant",
        amenities: existingProperty.amenities || [],
        mealsIncluded: existingProperty.mealsIncluded || false,
        upiId: existingProperty.upiId || "",
        cancellationPolicy: existingProperty.cancellationPolicy || "",
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
        }
      });
    } else {
      createProperty(payload, {
        onSuccess: () => {
          Alert.alert("Success", "Property created successfully");
          router.back();
        }
      });
    }
  };

  return (
    <KeyboardAwareScrollViewCompat style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? "Edit Property" : "Add Property"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Property Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.name}
          onChangeText={text => setForm({ ...form, name: text })}
          placeholder="e.g. Mountain View Cottage"
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.address}
          onChangeText={text => setForm({ ...form, address: text })}
          multiline
          placeholder="Full address"
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.city}
              onChangeText={text => setForm({ ...form, city: text })}
              placeholder="e.g. Coorg"
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.state}
              onChangeText={text => setForm({ ...form, state: text })}
              placeholder="e.g. Karnataka"
            />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.description}
          onChangeText={text => setForm({ ...form, description: text })}
          multiline
          placeholder="Tell guests about your place"
        />

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
            <Text style={[styles.roleBtnText, form.bookingMode === "instant" && { color: "#fff" }]}>Instant</Text>
          </Pressable>
          <Pressable
            style={[
              styles.roleBtn,
              { borderColor: colors.border },
              form.bookingMode === "inquiry" && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setForm({ ...form, bookingMode: "inquiry" })}
          >
            <Text style={[styles.roleBtnText, form.bookingMode === "inquiry" && { color: "#fff" }]}>Inquiry</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITIES.map(amenity => (
            <Pressable
              key={amenity}
              style={[
                styles.amenityChip,
                { borderColor: colors.border },
                form.amenities.includes(amenity) && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => toggleAmenity(amenity)}
            >
              <Text style={[styles.amenityText, form.amenities.includes(amenity) && { color: "#fff" }]}>{amenity}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Meals Included</Text>
          <Pressable
            style={[styles.switch, { backgroundColor: form.mealsIncluded ? colors.primary : colors.muted }]}
            onPress={() => setForm({ ...form, mealsIncluded: !form.mealsIncluded })}
          >
            <View style={[styles.switchThumb, { transform: [{ translateX: form.mealsIncluded ? 22 : 2 }] }]} />
          </Pressable>
        </View>

        <Text style={styles.label}>UPI ID (for payments)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.upiId}
          onChangeText={text => setForm({ ...form, upiId: text })}
          placeholder="e.g. host@upi"
        />

        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.primary }, (isCreating || isUpdating) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{isEditing ? "Update Property" : "Add Property"}</Text>
          )}
        </Pressable>
        <View style={{ height: 40 }} />
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
  textArea: { height: 100, paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
  roleSelector: { flexDirection: "row", gap: 12, marginBottom: 24 },
  roleBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  roleBtnText: { fontWeight: "600", fontSize: 14 },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  amenityChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  amenityText: { fontSize: 12, fontWeight: "500" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  switch: { width: 50, height: 28, borderRadius: 14, justifyContent: "center" },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff" },
  submitButton: { height: 56, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
