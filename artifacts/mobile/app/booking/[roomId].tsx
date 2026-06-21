import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateBooking, useGetProperty, useGetRoom } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import DatePicker from "@/components/DatePicker";

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function BookingScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: room, isLoading: isLoadingRoom } = useGetRoom(roomId!);
  const { data: property } = useGetProperty(room?.propertyId || "", {
    query: { enabled: !!room?.propertyId } as any,
  });
  const { mutate: createBooking, isPending } = useCreateBooking();

  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    guestCount: "2",
    guestName: user?.name || "",
    guestEmail: user?.email || "",
    guestMobile: user?.mobile || "",
    specialRequests: "",
  });

  const [successData, setSuccessData] = useState<{
    referenceNumber: string;
    totalAmount: number;
  } | null>(null);

  const nights = useMemo(() => calcNights(form.checkIn, form.checkOut), [form.checkIn, form.checkOut]);
  const totalAmount = nights * (room?.pricePerNight || 0);

  const handleBooking = () => {
    if (!form.checkIn || !form.checkOut) {
      Alert.alert("Select Dates", "Please pick your check-in and check-out dates.");
      return;
    }
    if (nights <= 0) {
      Alert.alert("Invalid Dates", "Check-out must be after check-in.");
      return;
    }
    if (!form.guestName || !form.guestEmail || !form.guestMobile) {
      Alert.alert("Missing Info", "Please enter your name, email, and mobile number.");
      return;
    }

    createBooking(
      {
        data: {
          roomId: roomId!,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestCount: parseInt(form.guestCount) || 1,
          guestName: form.guestName,
          guestEmail: form.guestEmail,
          guestMobile: form.guestMobile,
          specialRequests: form.specialRequests || undefined,
          guestId: user?.id,
        },
      },
      {
        onSuccess: (data) => {
          setSuccessData({ referenceNumber: data.referenceNumber, totalAmount: data.totalAmount });
        },
        onError: (error: any) => {
          const msg =
            error?.data?.message || error?.message || "Something went wrong. Please try again.";
          Alert.alert("Booking Failed", msg);
        },
      }
    );
  };

  const copyReference = () => {
    if (successData) {
      Clipboard.setString(successData.referenceNumber);
      Alert.alert("Copied!", "Booking reference copied to clipboard.");
    }
  };

  const openUPI = () => {
    if (!successData || !property?.upiId) return;
    const upiUrl = `upi://pay?pa=${property.upiId}&pn=${encodeURIComponent(property.name)}&am=${successData.totalAmount}&tn=Booking%20${successData.referenceNumber}&cu=INR`;
    Linking.openURL(upiUrl);
  };

  const shareWhatsApp = () => {
    if (!successData) return;
    const text = `🏡 Booking Confirmed!\nProperty: ${property?.name}\nRef: ${successData.referenceNumber}\nCheck-in: ${form.checkIn}\nCheck-out: ${form.checkOut}\n${nights} night${nights !== 1 ? "s" : ""}\nTotal: ₹${successData.totalAmount.toLocaleString("en-IN")}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const notifyHostWhatsApp = () => {
    if (!successData || !(property as any)?.phone) return;
    const hostPhone = (property as any).phone;
    const msg = `Hi! I just made a booking at ${property?.name}.\n\n📋 Ref: #${successData.referenceNumber}\n👤 Guest: ${form.guestName}\n📱 Mobile: +91${form.guestMobile}\n📅 Check-in: ${form.checkIn}\n📅 Check-out: ${form.checkOut}\n🛏 Room: ${room?.name}\n💰 Total: ₹${successData.totalAmount.toLocaleString("en-IN")}\n\nPlease confirm my booking. Thank you!`;
    Linking.openURL(`https://wa.me/91${hostPhone}?text=${encodeURIComponent(msg)}`);
  };

  if (isLoadingRoom) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── SUCCESS SCREEN ──
  if (successData) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.successIconWrap, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
          <Text style={styles.successSub}>Your stay at {property?.name} is all set.</Text>

          <View style={[styles.refCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.refCardLabel}>Booking Reference</Text>
            <Text style={[styles.refCardValue, { color: colors.primary }]}>{successData.referenceNumber}</Text>
            <Pressable style={styles.copyBtn} onPress={copyReference}>
              <Feather name="copy" size={16} color={colors.primary} />
              <Text style={[styles.copyText, { color: colors.primary }]}>Copy Reference</Text>
            </Pressable>
          </View>

          <View style={[styles.stayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { l: "Room", v: room?.name },
              { l: "Check-in", v: form.checkIn },
              { l: "Check-out", v: form.checkOut },
              { l: `${nights} night${nights !== 1 ? "s" : ""}`, v: `₹${successData.totalAmount.toLocaleString("en-IN")}` },
            ].map(({ l, v }, i) => (
              <View key={i} style={[styles.stayRow, i > 0 && { borderTopWidth: 1, borderColor: colors.border + "60" }]}>
                <Text style={styles.stayLabel}>{l}</Text>
                <Text style={styles.stayValue}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Payment Options */}
          <Text style={[styles.payHeader, { color: colors.foreground }]}>Complete Your Payment</Text>
          <Text style={[styles.paySub, { color: colors.mutedForeground }]}>
            Choose a payment method for ₹{successData.totalAmount.toLocaleString("en-IN")}
          </Text>

          {/* UPI Options */}
          {property?.upiId && (
            <View style={[styles.paySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.paySectionHead}>
                <Ionicons name="qr-code-outline" size={18} color="#6366F1" />
                <Text style={[styles.paySectionTitle, { color: colors.foreground }]}>Pay via UPI</Text>
              </View>
              <Text style={[styles.payUpiId, { color: colors.mutedForeground }]}>UPI ID: {property.upiId}</Text>
              <View style={styles.upiAppsRow}>
                {[
                  { name: "PhonePe", color: "#5F259F", url: `phonepe://pay?pa=${property.upiId}&pn=${encodeURIComponent(property?.name ?? "")}&am=${successData.totalAmount}&tn=Booking+${successData.referenceNumber}&cu=INR`, icon: "📱" },
                  { name: "GPay", color: "#1A73E8", url: `tez://upi/pay?pa=${property.upiId}&pn=${encodeURIComponent(property?.name ?? "")}&am=${successData.totalAmount}&tn=Booking+${successData.referenceNumber}&cu=INR`, icon: "💳" },
                  { name: "Paytm", color: "#00BAF2", url: `paytmmp://pay?pa=${property.upiId}&pn=${encodeURIComponent(property?.name ?? "")}&am=${successData.totalAmount}&tn=Booking+${successData.referenceNumber}&cu=INR`, icon: "🅿️" },
                  { name: "Any UPI", color: "#E8824A", url: `upi://pay?pa=${property.upiId}&pn=${encodeURIComponent(property?.name ?? "")}&am=${successData.totalAmount}&tn=Booking+${successData.referenceNumber}&cu=INR`, icon: "📲" },
                ].map(app => (
                  <Pressable
                    key={app.name}
                    style={[styles.upiAppBtn, { borderColor: app.color + "50", backgroundColor: app.color + "0F" }]}
                    onPress={() => Linking.openURL(app.url).catch(() => {})}
                  >
                    <Text style={styles.upiAppIcon}>{app.icon}</Text>
                    <Text style={[styles.upiAppName, { color: app.color }]}>{app.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Bank Transfer */}
          {(property as any)?.bankDetails && (
            <View style={[styles.paySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.paySectionHead}>
                <Feather name="credit-card" size={18} color="#10B981" />
                <Text style={[styles.paySectionTitle, { color: colors.foreground }]}>Bank Transfer (NEFT/IMPS)</Text>
              </View>
              <Text style={[styles.bankDetailsText, { color: colors.foreground }]}>{(property as any).bankDetails}</Text>
              <Pressable
                style={[styles.smallCopyBtn, { borderColor: colors.primary }]}
                onPress={() => Clipboard.setString((property as any).bankDetails)}
              >
                <Feather name="copy" size={13} color={colors.primary} />
                <Text style={[styles.smallCopyText, { color: colors.primary }]}>Copy Account Details</Text>
              </Pressable>
            </View>
          )}

          {/* Cash */}
          <View style={[styles.paySection, { backgroundColor: "#FFF8ED", borderColor: "#F59E0B40" }]}>
            <View style={styles.paySectionHead}>
              <Feather name="dollar-sign" size={18} color="#F59E0B" />
              <Text style={[styles.paySectionTitle, { color: "#92400E" }]}>Pay Cash at Check-in</Text>
            </View>
            <Text style={[styles.cashNote, { color: "#78350F" }]}>
              You can pay ₹{successData.totalAmount.toLocaleString("en-IN")} in cash directly at the property. Please carry exact change.
            </Text>
          </View>

          <View style={styles.successActions}>
            {(property as any)?.phone ? (
              <Pressable style={[styles.waBtn, { backgroundColor: "#25D366" }]} onPress={notifyHostWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.waBtnText}>Notify Host via WhatsApp</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.waBtn, { backgroundColor: "#128C7E" }]} onPress={shareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.waBtnText}>Share Booking Details</Text>
            </Pressable>
            <Pressable
              style={[styles.doneBtn, { borderColor: colors.border }]}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={[styles.doneBtnText, { color: colors.foreground }]}>Back to Home</Text>
            </Pressable>
          </View>
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    );
  }

  // ── BOOKING FORM ──
  const todayStr = new Date().toISOString().split("T")[0]!;

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
        <Text style={styles.headerTitle}>Book Your Stay</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Room summary */}
        <View style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.roomIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="home" size={26} color={colors.primary} />
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{room?.name}</Text>
            <Text style={styles.roomMeta}>{room?.type} · Max {room?.capacity} guests</Text>
            <Text style={[styles.roomPrice, { color: colors.primary }]}>
              ₹{room?.pricePerNight.toLocaleString("en-IN")}/night
            </Text>
          </View>
        </View>

        {/* Date Section */}
        <Text style={styles.sectionLabel}>SELECT DATES</Text>

        <Text style={styles.fieldLabel}>Check-in Date</Text>
        <DatePicker
          value={form.checkIn}
          onChange={(date) =>
            setForm((prev) => ({
              ...prev,
              checkIn: date,
              checkOut: prev.checkOut && prev.checkOut <= date ? "" : prev.checkOut,
            }))
          }
          placeholder="Tap to select check-in"
          minDate={todayStr}
          label="Select Check-in Date"
        />

        <Text style={styles.fieldLabel}>Check-out Date</Text>
        <DatePicker
          value={form.checkOut}
          onChange={(date) => setForm((prev) => ({ ...prev, checkOut: date }))}
          placeholder="Tap to select check-out"
          minDate={form.checkIn || todayStr}
          label="Select Check-out Date"
        />

        {/* Live price */}
        {nights > 0 && (
          <View style={[styles.priceBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "40" }]}>
            <Feather name="moon" size={16} color={colors.primary} />
            <Text style={styles.priceCalc}>
              ₹{room?.pricePerNight.toLocaleString("en-IN")} × {nights} night{nights !== 1 ? "s" : ""}
            </Text>
            <Text style={[styles.priceTotal, { color: colors.primary }]}>
              ₹{totalAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        {/* Guest count */}
        <Text style={styles.sectionLabel}>NUMBER OF GUESTS</Text>
        <View style={styles.countRow}>
          {["1", "2", "3", "4", "5+"].map((n) => (
            <Pressable
              key={n}
              style={[
                styles.countBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                form.guestCount === n && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setForm((p) => ({ ...p, guestCount: n }))}
            >
              <Text style={[styles.countBtnText, form.guestCount === n && { color: "#fff" }]}>{n}</Text>
            </Pressable>
          ))}
        </View>

        {/* Guest Details */}
        <Text style={styles.sectionLabel}>YOUR DETAILS</Text>

        <Text style={styles.fieldLabel}>Full Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guestName}
          onChangeText={(t) => setForm((p) => ({ ...p, guestName: t }))}
          placeholder="Your full name"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.fieldLabel}>Email Address *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guestEmail}
          onChangeText={(t) => setForm((p) => ({ ...p, guestEmail: t }))}
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Mobile / WhatsApp *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.guestMobile}
          onChangeText={(t) => setForm((p) => ({ ...p, guestMobile: t }))}
          placeholder="10-digit mobile number"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={styles.fieldLabel}>Special Requests (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          value={form.specialRequests}
          onChangeText={(t) => setForm((p) => ({ ...p, specialRequests: t }))}
          multiline
          placeholder="Early check-in, vegetarian meals, room on ground floor..."
          placeholderTextColor={colors.mutedForeground}
        />

        {/* Confirm */}
        <Pressable
          style={[styles.confirmBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.65 }]}
          onPress={handleBooking}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.confirmInner}>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={styles.confirmText}>
                {nights > 0
                  ? `Confirm Booking · ₹${totalAmount.toLocaleString("en-IN")}`
                  : "Confirm Booking"}
              </Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.policyNote}>
          {property?.bookingMode === "instant"
            ? "⚡ Instant confirmation — your room is reserved immediately."
            : "📋 Inquiry mode — the host will confirm within 24 hours."}
        </Text>

        <View style={{ height: 80 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

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
    marginTop: 24,
  },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },

  roomCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  roomIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  roomMeta: { fontSize: 12, color: "#8A7A6E", marginBottom: 4 },
  roomPrice: { fontSize: 16, fontWeight: "800" },

  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  priceCalc: { flex: 1, fontSize: 14, color: "#555" },
  priceTotal: { fontSize: 20, fontWeight: "900" },

  countRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  countBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countBtnText: { fontSize: 16, fontWeight: "700" },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  textarea: { height: 90, paddingTop: 12, textAlignVertical: "top" },

  confirmBtn: {
    height: 58,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  confirmInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  policyNote: { fontSize: 12, color: "#8A7A6E", textAlign: "center", marginTop: 12, lineHeight: 20 },

  // Success
  successContainer: { flex: 1 },
  successContent: { padding: 24, alignItems: "center" },
  successIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  successSub: { fontSize: 14, color: "#8A7A6E", textAlign: "center", marginBottom: 24 },
  refCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 14,
  },
  refCardLabel: { fontSize: 11, color: "#8A7A6E", fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  refCardValue: { fontSize: 30, fontWeight: "900", letterSpacing: 2, marginBottom: 12 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  copyText: { fontSize: 14, fontWeight: "700" },
  stayCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  stayRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16 },
  stayLabel: { fontSize: 13, color: "#8A7A6E" },
  stayValue: { fontSize: 14, fontWeight: "700" },
  successActions: { width: "100%", gap: 12 },
  upiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  upiBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#25D366",
  },
  waBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  doneBtnText: { fontSize: 16, fontWeight: "700" },
  payHeader: { fontSize: 18, fontWeight: "800", marginTop: 20, marginBottom: 4, width: "100%", textAlign: "left" },
  paySub: { fontSize: 13, marginBottom: 14, width: "100%", textAlign: "left" },
  paySection: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  paySectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  paySectionTitle: { fontSize: 15, fontWeight: "800" },
  payUpiId: { fontSize: 13, marginBottom: 12 },
  upiAppsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  upiAppBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  upiAppIcon: { fontSize: 14 },
  upiAppName: { fontSize: 12, fontWeight: "700" },
  bankDetailsText: { fontSize: 12, lineHeight: 20, fontFamily: "monospace" },
  smallCopyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  smallCopyText: { fontSize: 12, fontWeight: "700" },
  cashNote: { fontSize: 13, lineHeight: 20 },
});
