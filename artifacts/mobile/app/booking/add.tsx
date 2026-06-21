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
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostProperties, useCreateBooking } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function AddBookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: properties } = useGetHostProperties();
  const { mutate: createBooking, isPending } = useCreateBooking();

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestMobile: "",
    checkIn: "",
    checkOut: "",
    guests: "1",
    specialRequests: "",
  });

  const rooms = selectedProperty?.rooms || [];

  const handleSubmit = () => {
    if (!selectedProperty || !selectedRoom) {
      Alert.alert("Missing Info", "Please select a property and room.");
      return;
    }
    if (!form.guestName || !form.guestEmail || !form.guestMobile || !form.checkIn || !form.checkOut) {
      Alert.alert("Missing Info", "Please fill in guest name, email, mobile, and dates.");
      return;
    }

    createBooking(
      {
        data: {
          roomId: selectedRoom.id,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestCount: parseInt(form.guests) || 1,
          guestName: form.guestName,
          guestEmail: form.guestEmail,
          guestMobile: form.guestMobile,
          specialRequests: form.specialRequests || undefined,
        },
      },
      {
        onSuccess: () => {
          Alert.alert("Booking Created!", "The booking has been added successfully.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        },
        onError: (err: any) => {
          Alert.alert("Error", err?.data?.message || "Failed to create booking.");
        },
      }
    );
  };

  const formatDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 4 && cleaned.length <= 6) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    if (cleaned.length > 6) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    return cleaned;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.primary }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Property Selection */}
        <Text style={styles.sectionLabel}>SELECT PROPERTY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {(properties || []).map((prop: any) => (
            <Pressable
              key={prop.id}
              style={[
                styles.propertyChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                selectedProperty?.id === prop.id && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => { setSelectedProperty(prop); setSelectedRoom(null); }}
            >
              <Feather name="home" size={14} color={selectedProperty?.id === prop.id ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.propertyChipText, selectedProperty?.id === prop.id && { color: "#fff" }]}>
                {prop.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Room Selection */}
        {selectedProperty && (
          <>
            <Text style={styles.sectionLabel}>SELECT ROOM</Text>
            {rooms.length === 0 ? (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>No rooms found for this property</Text>
            ) : (
              <View style={styles.roomsGrid}>
                {rooms.map((room: any) => (
                  <Pressable
                    key={room.id}
                    style={[
                      styles.roomChip,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      selectedRoom?.id === room.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedRoom(room)}
                  >
                    <Text style={[styles.roomChipName, selectedRoom?.id === room.id && { color: "#fff" }]}>{room.name}</Text>
                    <Text style={[styles.roomChipPrice, selectedRoom?.id === room.id && { color: "rgba(255,255,255,0.8)" }]}>
                      ₹{room.pricePerNight?.toLocaleString("en-IN")}/night
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* Guest Info */}
        <Text style={styles.sectionLabel}>GUEST INFORMATION</Text>

        <Text style={styles.label}>Guest Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guestName}
          onChangeText={text => setForm({ ...form, guestName: text })}
          placeholder="Full name"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Guest Email *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guestEmail}
          onChangeText={text => setForm({ ...form, guestEmail: text })}
          placeholder="email@example.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Mobile / WhatsApp</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guestMobile}
          onChangeText={text => setForm({ ...form, guestMobile: text })}
          placeholder="10-digit mobile number"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          maxLength={10}
        />

        {/* Dates */}
        <Text style={styles.sectionLabel}>STAY DATES</Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Check-In Date *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.checkIn}
              onChangeText={text => setForm({ ...form, checkIn: formatDate(text) })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>Check-Out Date *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              value={form.checkOut}
              onChangeText={text => setForm({ ...form, checkOut: formatDate(text) })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        <Text style={styles.label}>Number of Guests</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guests}
          onChangeText={text => setForm({ ...form, guests: text })}
          placeholder="1"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Special Requests</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.specialRequests}
          onChangeText={text => setForm({ ...form, specialRequests: text })}
          multiline
          placeholder="Any special needs or requests..."
          placeholderTextColor={colors.mutedForeground}
        />

        {/* Price Summary */}
        {selectedRoom && form.checkIn && form.checkOut && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{selectedRoom.name}</Text>
              <Text style={styles.summaryValue}>₹{selectedRoom.pricePerNight?.toLocaleString("en-IN")}/night</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Estimated Total</Text>
              <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>
                ₹{(selectedRoom.pricePerNight || 0).toLocaleString("en-IN")}+
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.submitInner}>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Booking</Text>
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
    marginBottom: 12,
    marginTop: 20,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#444" },
  hint: { fontSize: 13, fontStyle: "italic", marginBottom: 16 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 16 },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
  propertyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  propertyChipText: { fontSize: 13, fontWeight: "600", color: "#8A7A6E" },
  roomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  roomChip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
  },
  roomChipName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  roomChipPrice: { fontSize: 11, color: "#8A7A6E" },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 14, fontWeight: "800", marginBottom: 12, color: "#444" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryDivider: { height: 1, marginVertical: 8 },
  summaryTotal: { fontSize: 15, fontWeight: "800" },
  summaryTotalValue: { fontSize: 18, fontWeight: "800" },
  submitButton: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 8 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
