import {
  ActivityIndicator,
  Alert,
  Clipboard,
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
import { useCreateBooking, useGetRoom } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function BookingScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: room, isLoading: isLoadingRoom } = useGetRoom(roomId!);
  const { mutate: createBooking, isPending } = useCreateBooking();

  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    guestCount: "1",
    guestName: user?.name || "",
    guestEmail: user?.email || "",
    guestMobile: user?.mobile || "",
    specialRequests: "",
  });

  const [successData, setSuccessData] = useState<{ referenceNumber: string } | null>(null);

  const calculateTotal = () => {
    if (!room) return 0;
    // Simple mock calculation - in real app would use date diff
    const nights = 2; 
    return nights * room.pricePerNight;
  };

  const handleBooking = () => {
    if (!form.checkIn || !form.checkOut || !form.guestName || !form.guestEmail || !form.guestMobile) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    createBooking(
      {
        data: {
          roomId: roomId!,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestCount: parseInt(form.guestCount),
          guestName: form.guestName,
          guestEmail: form.guestEmail,
          guestMobile: form.guestMobile,
          specialRequests: form.specialRequests,
          guestId: user?.id,
        },
      },
      {
        onSuccess: (data) => {
          setSuccessData(data);
        },
        onError: (error: any) => {
          Alert.alert("Booking Failed", error.message || "Something went wrong.");
        },
      }
    );
  };

  const copyReference = () => {
    if (successData) {
      Clipboard.setString(successData.referenceNumber);
      Alert.alert("Copied", "Reference number copied to clipboard.");
    }
  };

  if (isLoadingRoom) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (successData) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.successContent}>
          <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={60} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSub}>Your stay at {room?.name} is booked.</Text>
          
          <View style={[styles.referenceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.referenceLabel}>Booking Reference</Text>
            <Text style={styles.referenceValue}>{successData.referenceNumber}</Text>
            <Pressable style={styles.copyButton} onPress={copyReference}>
              <Feather name="copy" size={16} color={colors.primary} />
              <Text style={[styles.copyText, { color: colors.primary }]}>Copy</Text>
            </Pressable>
          </View>

          <Text style={styles.successHint}>Keep this reference number to track your booking.</Text>

          <Pressable
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.doneButtonText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.roomSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryTitle}>{room?.name}</Text>
          <Text style={styles.summarySub}>{room?.type} • ₹{room?.pricePerNight.toLocaleString("en-IN")}/night</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Stay Dates</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Check-in</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                value={form.checkIn}
                onChangeText={(text) => setForm({ ...form, checkIn: text })}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Check-out</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                value={form.checkOut}
                onChangeText={(text) => setForm({ ...form, checkOut: text })}
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Guest Details</Text>
          <Text style={styles.label}>Number of Guests</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
            keyboardType="number-pad"
            value={form.guestCount}
            onChangeText={(text) => setForm({ ...form, guestCount: text })}
          />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="John Doe"
            value={form.guestName}
            onChangeText={(text) => setForm({ ...form, guestName: text })}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.guestEmail}
            onChangeText={(text) => setForm({ ...form, guestEmail: text })}
          />

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="9876543210"
            keyboardType="phone-pad"
            value={form.guestMobile}
            onChangeText={(text) => setForm({ ...form, guestMobile: text })}
          />

          <Text style={styles.label}>Special Requests (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Any extra requirements?"
            multiline
            numberOfLines={3}
            value={form.specialRequests}
            onChangeText={(text) => setForm({ ...form, specialRequests: text })}
          />
        </View>

        <View style={[styles.priceBreakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.breakdownTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>₹{room?.pricePerNight.toLocaleString("en-IN")} x 2 nights</Text>
            <Text style={styles.priceValue}>₹{calculateTotal().toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{calculateTotal().toLocaleString("en-IN")}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]}
          onPress={handleBooking}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Confirm and Book</Text>
          )}
        </Pressable>
        <View style={{ height: 40 }} />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  roomSummary: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 14,
    color: "#666",
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1B6B5A",
  },
  row: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#444",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  priceBreakdown: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B6B5A",
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  referenceCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 24,
  },
  referenceLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  referenceValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copyText: {
    fontWeight: "600",
  },
  successHint: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginBottom: 40,
  },
  doneButton: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
