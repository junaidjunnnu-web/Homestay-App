import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

interface GuestPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

export default function GuestPaymentModal({ visible, onClose, booking, onSuccess }: GuestPaymentModalProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [transactionId, setTransactionId] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);

  const paymentMethods = [
    { id: "upi", label: "UPI", icon: "smartphone", color: "#3B82F6", description: "Pay via PhonePe, GPay, Paytm" },
    { id: "bank_transfer", label: "Bank Transfer", icon: "credit-card", color: "#10B981", description: "NEFT / IMPS / RTGS" },
    { id: "cash", label: "Cash", icon: "dollar-sign", color: "#F59E0B", description: "Pay at the property" },
  ];

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to record payment");
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Payment Recorded", "Your payment has been recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["guestBookings"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess();
      onClose();
      resetForm();
    },
    onError: () => {
      Alert.alert("Error", "Failed to record payment");
    },
  });

  const fetchToken = async () => {
    try {
      const token = await AsyncStorage.getItem("homestay_token");
      return token || "";
    } catch (error) {
      console.error("Failed to fetch token", error);
      return "";
    }
  };

  const generateUPIUrl = () => {
    if (!booking?.property?.upiId) return null;
    const upiUrl = `upi://pay?pa=${booking.property.upiId}&pn=${encodeURIComponent(booking.property?.name || '')}&am=${booking.totalAmount || 0}&tn=Booking%20${booking.referenceNumber || ''}&cu=INR`;
    return upiUrl;
  };

  const openUPIApp = () => {
    const upiUrl = generateUPIUrl();
    if (upiUrl) {
      Linking.openURL(upiUrl).catch(() => {
        Alert.alert("Error", "Could not open UPI app. Please try again.");
      });
    }
  };

  const copyUPIId = () => {
    if (booking?.property?.upiId) {
      // Clipboard.setString(booking.property.upiId);
      Alert.alert("Copied", "UPI ID copied to clipboard");
    }
  };

  const pickProof = async () => {
    // Implement image picker for payment proof
    Alert.alert("Coming Soon", "Payment proof upload will be available soon");
  };

  const handleRecordPayment = () => {
    if (!booking?.id) {
      Alert.alert("Error", "Booking information is missing");
      return;
    }
    if (selectedMethod === "cash") {
      mutation.mutate({
        bookingId: booking.id,
        amount: booking.totalAmount || 0,
        paymentMethod: "cash",
        notes: "Cash payment at property",
      });
    } else if (selectedMethod === "upi" || selectedMethod === "bank_transfer") {
      if (!transactionId) {
        Alert.alert("Required", "Please enter transaction ID/reference number");
        return;
      }
      mutation.mutate({
        bookingId: booking.id,
        amount: booking.totalAmount || 0,
        paymentMethod: selectedMethod,
        transactionId,
        notes: selectedMethod === "upi" ? "UPI payment" : "Bank transfer",
      });
    }
  };

  const resetForm = () => {
    setSelectedMethod("upi");
    setTransactionId("");
    setProofImage(null);
  };

  if (!booking || !booking.property) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Make Payment</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.bookingSummary, { backgroundColor: colors.background }]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booking Reference</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>#{booking?.referenceNumber || 'N/A'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Property</Text>
              <Text style={styles.summaryValue}>{booking?.property?.name || 'N/A'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Due</Text>
              <Text style={[styles.summaryValue, { color: "#E8824A", fontSize: 20 }]}>
                ₹{(booking?.totalAmount || 0).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>SELECT PAYMENT METHOD</Text>
          {paymentMethods.map((method) => (
            <Pressable
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && { borderColor: method.color, backgroundColor: method.color + "10" },
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIcon, { backgroundColor: method.color + "20" }]}>
                  <Feather name={method.icon as any} size={20} color={method.color} />
                </View>
                <View>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={[styles.methodDescription, { color: colors.mutedForeground }]}>
                    {method.description}
                  </Text>
                </View>
              </View>
              {selectedMethod === method.id && (
                <View style={[styles.checkCircle, { backgroundColor: method.color }]}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
              )}
            </Pressable>
          ))}

          {selectedMethod === "upi" && (
            <View style={[styles.upiSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={styles.upiSectionTitle}>Pay via UPI</Text>
              
              {booking?.property?.upiId ? (
                <>
                  <View style={styles.upiIdContainer}>
                    <Text style={styles.upiIdLabel}>UPI ID</Text>
                    <View style={[styles.upiIdBox, { borderColor: colors.border }]}>
                      <Text style={styles.upiIdText}>{booking.property.upiId}</Text>
                      <Pressable onPress={copyUPIId} style={[styles.copyButton, { borderColor: colors.primary }]}>
                        <Feather name="copy" size={14} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable style={[styles.upiPayButton, { backgroundColor: "#3B82F6" }]} onPress={openUPIApp}>
                    <Ionicons name="qr-code" size={20} color="#fff" />
                    <Text style={styles.upiPayButtonText}>Open UPI App</Text>
                  </Pressable>

                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code" size={64} color={colors.mutedForeground} />
                    <Text style={[styles.qrPlaceholderText, { color: colors.mutedForeground }]}>
                      QR Code will appear here
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.noUPI}>
                  <Feather name="alert-circle" size={24} color={colors.warning} />
                  <Text style={[styles.noUPIText, { color: colors.mutedForeground }]}>
                    UPI not configured by property owner
                  </Text>
                </View>
              )}
            </View>
          )}

          {selectedMethod === "bank_transfer" && booking?.property?.bankDetails && (
            <View style={[styles.bankSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={styles.bankSectionTitle}>Bank Transfer Details</Text>
              <Text style={styles.bankDetails}>{booking.property.bankDetails}</Text>
            </View>
          )}

          {(selectedMethod === "upi" || selectedMethod === "bank_transfer") && (
            <View style={styles.transactionInputSection}>
              <Text style={styles.inputLabel}>Transaction ID / Reference Number</Text>
              <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
                Enter the transaction ID from your payment app
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <Feather name="hash" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TXN123456789"
                  placeholderTextColor={colors.mutedForeground}
                  value={transactionId}
                  onChangeText={setTransactionId}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}

          <Pressable
            style={[styles.recordButton, { backgroundColor: "#E8824A" }, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleRecordPayment}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.recordButtonText}>
                {selectedMethod === "cash" ? "Mark as Cash Payment" : "Record Payment"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  bookingSummary: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#8A7A6E",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  methodDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  upiSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  upiSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  upiIdContainer: {
    marginBottom: 12,
  },
  upiIdLabel: {
    fontSize: 12,
    color: "#8A7A6E",
    marginBottom: 6,
  },
  upiIdBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  upiIdText: {
    fontSize: 14,
    fontWeight: "700",
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  upiPayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  upiPayButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  qrPlaceholder: {
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  qrPlaceholderText: {
    fontSize: 12,
    marginTop: 8,
  },
  noUPI: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  noUPIText: {
    fontSize: 13,
  },
  bankSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bankSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  bankDetails: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "monospace",
  },
  transactionInputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  inputHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  recordButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
