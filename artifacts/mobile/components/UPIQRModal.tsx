import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
  Share,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useColors } from "@/hooks/useColors";
import QRCode from "react-native-qrcode-svg";

interface UPIQRModalProps {
  visible: boolean;
  onClose: () => void;
  upiId: string;
  amount: number;
  bookingRef: string;
  property?: string;
}

export default function UPIQRModal({ visible, onClose, upiId, amount, bookingRef, property }: UPIQRModalProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(property || 'Homestay')}&am=${amount}&tn=Booking%20${bookingRef}&cu=INR`;
  const upiLink = `https://upi.link/?${upiUrl.replace('upi://pay?', '')}`;

  const copyUPIId = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUPI = async () => {
    try {
      await Share.share({
        message: `Pay ₹${amount} for booking ${bookingRef} via UPI\n\nUPI ID: ${upiId}\n\nOr scan the QR code`,
      });
    } catch (error) {
      console.error("Share error", error);
    }
  };

  const openUPIApp = () => {
    Linking.openURL(upiUrl).catch(() => {
      Alert.alert("Error", "Unable to open UPI app. Please ensure you have a UPI app installed.");
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Pay via UPI</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* Amount */}
            <View style={[styles.amountCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Amount to Pay</Text>
              <Text style={[styles.amountValue, { color: colors.foreground }]}>₹{amount.toLocaleString("en-IN")}</Text>
              <Text style={[styles.bookingRef, { color: colors.mutedForeground }]}>Booking: {bookingRef}</Text>
            </View>

            {/* QR Code */}
            <View style={[styles.qrCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.qrLabel, { color: colors.foreground }]}>Scan QR Code</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={upiUrl}
                  size={200}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>
                Scan with any UPI app (GPay, PhonePe, Paytm, etc.)
              </Text>
            </View>

            {/* UPI ID */}
            <View style={[styles.upiCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.upiLabel, { color: colors.foreground }]}>UPI ID</Text>
              <View style={styles.upiRow}>
                <Text style={[styles.upiValue, { color: colors.foreground }]}>{upiId}</Text>
                <Pressable onPress={copyUPIId} style={[styles.copyButton, { backgroundColor: colors.primary + "20" }]}>
                  {copied ? (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  ) : (
                    <Feather name="copy" size={20} color={colors.primary} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={[styles.actionButton, { backgroundColor: "#E8824A" }]} onPress={openUPIApp}>
                <Ionicons name="logo-google" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Open UPI App</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, { backgroundColor: "#25D366" }]} onPress={shareUPI}>
                <Ionicons name="share-social" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Share Payment Link</Text>
              </Pressable>
            </View>

            {/* Instructions */}
            <View style={[styles.instructions, { backgroundColor: "#E8824A10", borderColor: "#E8824A30" }]}>
              <Feather name="info" size={16} color="#E8824A" />
              <Text style={[styles.instructionsText, { color: "#92400E" }]}>
                After payment, share the screenshot with your host for verification.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  title: { fontSize: 20, fontWeight: "700" },
  content: { flex: 1, padding: 20 },
  amountCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  amountLabel: { fontSize: 14, marginBottom: 4 },
  amountValue: { fontSize: 36, fontWeight: "800", marginBottom: 4 },
  bookingRef: { fontSize: 13 },
  qrCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  qrLabel: { fontSize: 16, fontWeight: "600", marginBottom: 16 },
  qrContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrHint: { fontSize: 12, textAlign: "center" },
  upiCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  upiLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  upiValue: { fontSize: 18, fontWeight: "700", flex: 1 },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  actions: { gap: 12, marginBottom: 20 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  instructions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  instructionsText: { fontSize: 13, flex: 1 },
});
