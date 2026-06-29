import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import UPIScannerModal from "@/components/UPIScannerModal";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

export default function PaymentModal({ visible, onClose, booking, onSuccess }: PaymentModalProps) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [notes, setNotes] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scannerVisible, setScannerVisible] = useState(false);

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: "dollar-sign", color: "#10B981" },
    { id: "upi", label: "UPI", icon: "smartphone", color: "#3B82F6" },
    { id: "bank_transfer", label: "Bank Transfer", icon: "credit-card", color: "#8B5CF6" },
    { id: "card", label: "Card Payment", icon: "credit-card", color: "#F59E0B" },
    { id: "google_pay", label: "Google Pay", icon: "chrome", color: "#4285F4" },
    { id: "phonepe", label: "PhonePe", icon: "smartphone", color: "#5F259F" },
    { id: "paytm", label: "Paytm", icon: "smartphone", color: "#00B9F5" },
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to record payment");
      }
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["hostBookings"] });
      queryClient.invalidateQueries({ queryKey: ["guestBookings"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to record payment");
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofImage) return null;

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: proofImage,
        type: "image/jpeg",
        name: `payment_proof_${Date.now()}.jpg`,
      } as any);

      const token = await fetchToken();
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      return data.url;
    } catch (error) {
      Alert.alert("Error", "Failed to upload proof");
      return null;
    }
  };

  const handleRecordPayment = async () => {
    if (!booking?.id) {
      Alert.alert("Error", "Booking information is missing");
      return;
    }
    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    let proofUrl = null;
    if (proofImage) {
      proofUrl = await uploadProof();
    }

    mutation.mutate({
      bookingId: booking.id,
      amount: Number(amount),
      paymentMethod,
      transactionId: transactionId || null,
      upiId: upiId || null,
      proofUrl,
      notes: notes || null,
    });
  };

  const resetForm = () => {
    setPaymentMethod("");
    setAmount("");
    setTransactionId("");
    setUpiId("");
    setNotes("");
    setProofImage(null);
    setUploadProgress(0);
  };

  const handleQRScanned = (data: string) => {
    // Extract transaction ID from UPI link if present
    const match = data.match(/tn=([^&]+)/);
    if (match) {
      setTransactionId(decodeURIComponent(match[1]));
    }
    setScannerVisible(false);
    Alert.alert("QR Scanned", "Payment QR code detected. Please verify the transaction ID.");
  };

  const generateUPIUrl = () => {
    if (!booking?.property?.upiId) return null;
    const upiUrl = `upi://pay?pa=${booking.property.upiId}&pn=${encodeURIComponent(booking.property.name || '')}&am=${amount || booking.totalAmount || 0}&tn=Booking%20${booking.referenceNumber || ''}&cu=INR`;
    return upiUrl;
  };

  const remainingAmount = (booking?.totalAmount || 0) - (booking?.paidAmount || 0);

  if (!booking) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.bookingSummary, { backgroundColor: colors.background }]}>
              <Text style={styles.summaryLabel}>Booking Reference</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>#{booking?.referenceNumber || 'N/A'}</Text>
              <Text style={styles.summaryLabel}>Guest Name</Text>
              <Text style={styles.summaryValue}>{booking?.guestName || 'N/A'}</Text>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>₹{(booking?.totalAmount || 0).toLocaleString("en-IN")}</Text>
              <Text style={styles.summaryLabel}>Already Paid</Text>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>₹{(booking?.paidAmount || 0).toLocaleString("en-IN")}</Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: "#E8824A" }]}>₹{remainingAmount.toLocaleString("en-IN")}</Text>
            </View>

            <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
            <View style={styles.paymentMethodsGrid}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    {
                      backgroundColor: paymentMethod === method.id ? method.color + "20" : colors.background,
                      borderColor: paymentMethod === method.id ? method.color : colors.border,
                    },
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <View style={[styles.methodIcon, { backgroundColor: method.color + "20" }]}>
                    <Feather name={method.icon as any} size={20} color={method.color} />
                  </View>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  {paymentMethod === method.id && (
                    <View style={[styles.checkBadge, { backgroundColor: method.color }]}>
                      <Feather name="check" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                value={amount}
                onChangeText={setAmount}
                placeholder={remainingAmount.toString()}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

            {paymentMethod === "upi" && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>UPI ID Used</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="e.g. guest@okhdfcbank"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                  />
                </View>
                {booking.property?.upiId && (
                  <TouchableOpacity
                    style={[styles.upiLinkBtn, { backgroundColor: "#3B82F6" }]}
                    onPress={() => {
                      const url = generateUPIUrl();
                      if (url) {
                        // Would open UPI app here
                        Alert.alert("UPI Link", `UPI URL generated: ${url}`);
                      }
                    }}
                  >
                    <Ionicons name="qr-code" size={20} color="#fff" />
                    <Text style={styles.upiLinkText}>Generate UPI Payment Link</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {(paymentMethod === "upi" || paymentMethod === "bank_transfer" || paymentMethod === "card") && (
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Transaction ID / Reference</Text>
                  {paymentMethod === "upi" && (
                    <Pressable onPress={() => setScannerVisible(true)} style={styles.scanBtn}>
                      <Ionicons name="qr-code-outline" size={18} color="#3B82F6" />
                      <Text style={styles.scanBtnText}>Scan QR</Text>
                    </Pressable>
                  )}
                </View>
                <TextInput
                  style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                  value={transactionId}
                  onChangeText={setTransactionId}
                  placeholder="Enter transaction reference number"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Proof (Screenshot/Receipt)</Text>
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: colors.border }]}
                onPress={pickImage}
              >
                {proofImage ? (
                  <View style={styles.previewContainer}>
                    <Text style={styles.uploadedText}>✓ Image Selected</Text>
                    <Pressable onPress={() => setProofImage(null)} hitSlop={8}>
                      <Feather name="x-circle" size={20} color={colors.destructive} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Feather name="upload" size={24} color={colors.mutedForeground} />
                    <Text style={styles.uploadPlaceholderText}>Tap to upload screenshot</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this payment..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.recordBtn, { backgroundColor: "#E8824A" }, mutation.isPending && { opacity: 0.7 }]}
              onPress={handleRecordPayment}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.recordBtnText}>Record Payment</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>

      <UPIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleQRScanned}
      />
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
  summaryLabel: {
    fontSize: 12,
    color: "#8A7A6E",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 5,
  },
  paymentMethodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    marginBottom: 20,
  },
  paymentMethodCard: {
    width: "31%",
    marginHorizontal: "1%",
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  methodLabel: { fontSize: 12, fontWeight: "700" },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  formGroup: { marginBottom: 16 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7A6E",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#3B82F610",
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  upiLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  upiLinkText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  uploadBtn: {
    height: 100,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
  },
  uploadPlaceholder: {
    alignItems: "center",
  },
  uploadPlaceholderText: {
    fontSize: 12,
    color: "#8A7A6E",
    marginTop: 8,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  uploadedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  recordBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  recordBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
