import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Switch,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export default function PaymentSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    acceptedPaymentMethods: ["cash"],
    defaultPaymentMethod: "cash",
    upiId: "",
    bankDetails: {
      accountNumber: "",
      ifscCode: "",
      beneficiaryName: "",
      bankName: "",
    },
    googlePayHandle: "",
    phonepeHandle: "",
    paytmNumber: "",
    paymentTerms: "on_arrival",
    advancePaymentPercentage: "50",
    cancellationRefundPolicy: "",
    allowDelayedPayment: false,
    delayedPaymentDays: "3",
  });

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["paymentSettings"],
    queryFn: async () => {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE}/payment-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch payment settings");
      return response.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        acceptedPaymentMethods: settings.acceptedPaymentMethods || ["cash"],
        defaultPaymentMethod: settings.defaultPaymentMethod || "cash",
        upiId: settings.upiId || "",
        bankDetails: settings.bankDetails || {
          accountNumber: "",
          ifscCode: "",
          beneficiaryName: "",
          bankName: "",
        },
        googlePayHandle: settings.googlePayHandle || "",
        phonepeHandle: settings.phonepeHandle || "",
        paytmNumber: settings.paytmNumber || "",
        paymentTerms: settings.paymentTerms || "on_arrival",
        advancePaymentPercentage: settings.advancePaymentPercentage || "50",
        cancellationRefundPolicy: settings.cancellationRefundPolicy || "",
        allowDelayedPayment: settings.allowDelayedPayment || false,
        delayedPaymentDays: settings.delayedPaymentDays || "3",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE}/payment-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update payment settings");
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Payment settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["paymentSettings"] });
    },
    onError: () => {
      Alert.alert("Error", "Failed to update payment settings");
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

  const togglePaymentMethod = (method: string) => {
    const current = formData.acceptedPaymentMethods;
    if (current.includes(method)) {
      setFormData({
        ...formData,
        acceptedPaymentMethods: current.filter((m) => m !== method),
        defaultPaymentMethod: formData.defaultPaymentMethod === method ? "cash" : formData.defaultPaymentMethod,
      });
    } else {
      setFormData({
        ...formData,
        acceptedPaymentMethods: [...current, method],
      });
    }
  };

  const handleSave = () => {
    if (formData.acceptedPaymentMethods.length === 0) {
      Alert.alert("Error", "Please select at least one payment method");
      return;
    }
    mutation.mutate(formData);
  };

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: "dollar-sign", color: "#10B981" },
    { id: "upi", label: "UPI", icon: "smartphone", color: "#3B82F6" },
    { id: "bank_transfer", label: "Bank Transfer", icon: "credit-card", color: "#8B5CF6" },
    { id: "card", label: "Card Payment", icon: "credit-card", color: "#F59E0B" },
    { id: "google_pay", label: "Google Pay", icon: "chrome", color: "#4285F4" },
    { id: "phonepe", label: "PhonePe", icon: "smartphone", color: "#5F259F" },
    { id: "paytm", label: "Paytm", icon: "smartphone", color: "#00B9F5" },
  ];

  if (!user || user.role !== "host") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: "#E8824A" }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#E8824A" />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#E8824A" style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACCEPTED PAYMENT METHODS</Text>
              <View style={styles.paymentMethodsGrid}>
                {paymentMethods.map((method) => (
                  <Pressable
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      {
                        backgroundColor: formData.acceptedPaymentMethods.includes(method.id)
                          ? method.color + "20"
                          : colors.surface,
                        borderColor: formData.acceptedPaymentMethods.includes(method.id)
                          ? method.color
                          : colors.border,
                      },
                    ]}
                    onPress={() => togglePaymentMethod(method.id)}
                  >
                    <View style={[styles.methodIcon, { backgroundColor: method.color + "20" }]}>
                      <Feather name={method.icon as any} size={20} color={method.color} />
                    </View>
                    <Text style={styles.methodLabel}>{method.label}</Text>
                    {formData.acceptedPaymentMethods.includes(method.id) && (
                      <View style={[styles.checkBadge, { backgroundColor: method.color }]}>
                        <Feather name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DEFAULT PAYMENT METHOD</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                <Text style={styles.label}>Select Default</Text>
                {formData.acceptedPaymentMethods.map((method) => (
                  <Pressable
                    key={method}
                    style={[
                      styles.radioOption,
                      formData.defaultPaymentMethod === method && { backgroundColor: "#E8824A" + "20" },
                    ]}
                    onPress={() => setFormData({ ...formData, defaultPaymentMethod: method })}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        formData.defaultPaymentMethod === method && { backgroundColor: "#E8824A", borderColor: "#E8824A" },
                      ]}
                    >
                      {formData.defaultPaymentMethod === method && <Feather name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.radioLabel}>
                      {paymentMethods.find((m) => m.id === method)?.label || method}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {formData.acceptedPaymentMethods.includes("upi") && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>UPI DETAILS</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.upiId}
                    onChangeText={(text) => setFormData({ ...formData, upiId: text })}
                    placeholder="e.g. owner@okhdfcbank"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {formData.acceptedPaymentMethods.includes("bank_transfer") && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>BANK ACCOUNT DETAILS</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bank Name</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.bankDetails.bankName}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: text },
                      })
                    }
                    placeholder="e.g. HDFC Bank"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.bankDetails.accountNumber}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountNumber: text },
                      })
                    }
                    placeholder="Your bank account number"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.bankDetails.ifscCode}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, ifscCode: text.toUpperCase() },
                      })
                    }
                    placeholder="e.g. HDFC0001234"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Beneficiary Name</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.bankDetails.beneficiaryName}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, beneficiaryName: text },
                      })
                    }
                    placeholder="Account holder name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            )}

            {formData.acceptedPaymentMethods.includes("google_pay") && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>GOOGLE PAY</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Google Pay Handle</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.googlePayHandle}
                    onChangeText={(text) => setFormData({ ...formData, googlePayHandle: text })}
                    placeholder="e.g. +919876543210"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {formData.acceptedPaymentMethods.includes("phonepe") && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PHONEPE</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>PhonePe Handle</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.phonepeHandle}
                    onChangeText={(text) => setFormData({ ...formData, phonepeHandle: text })}
                    placeholder="e.g. +919876543210"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {formData.acceptedPaymentMethods.includes("paytm") && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PAYTM</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Paytm Number</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.paytmNumber}
                    onChangeText={(text) => setFormData({ ...formData, paytmNumber: text })}
                    placeholder="e.g. +919876543210"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PAYMENT TERMS</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Collection</Text>
                {["advance", "on_arrival", "on_checkout"].map((term) => (
                  <Pressable
                    key={term}
                    style={[
                      styles.radioOption,
                      formData.paymentTerms === term && { backgroundColor: "#E8824A" + "20" },
                    ]}
                    onPress={() => setFormData({ ...formData, paymentTerms: term })}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        formData.paymentTerms === term && { backgroundColor: "#E8824A", borderColor: "#E8824A" },
                      ]}
                    >
                      {formData.paymentTerms === term && <Feather name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.radioLabel}>
                      {term === "advance" ? "Advance Payment" : term === "on_arrival" ? "On Arrival" : "On Checkout"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {formData.paymentTerms === "advance" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Advance Percentage (%)</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.advancePaymentPercentage}
                    onChangeText={(text) => setFormData({ ...formData, advancePaymentPercentage: text })}
                    placeholder="e.g. 50"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DELAYED PAYMENT</Text>
              <View style={[styles.switchRow, { backgroundColor: colors.surface }]}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Allow Delayed Payment</Text>
                  <Text style={styles.switchSubtitle}>Let guests pay after checkout</Text>
                </View>
                <Switch
                  value={formData.allowDelayedPayment}
                  onValueChange={(value) => setFormData({ ...formData, allowDelayedPayment: value })}
                  trackColor={{ false: colors.border, true: "#E8824A" }}
                  thumbColor={formData.allowDelayedPayment ? "#fff" : colors.mutedForeground}
                />
              </View>

              {formData.allowDelayedPayment && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Allowed Days After Checkout</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.delayedPaymentDays}
                    onChangeText={(text) => setFormData({ ...formData, delayedPaymentDays: text })}
                    placeholder="e.g. 3"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CANCELLATION POLICY</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Refund Policy</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
                  value={formData.cancellationRefundPolicy}
                  onChangeText={(text) => setFormData({ ...formData, cancellationRefundPolicy: text })}
                  placeholder="Describe your cancellation and refund policy..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: "#E8824A" }, mutation.isPending && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Payment Settings</Text>
              )}
            </Pressable>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
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
  },
  paymentMethodCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  methodLabel: { fontSize: 14, fontWeight: "700" },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    padding: 16,
    borderRadius: 16,
  },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7A6E",
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#E8824A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioLabel: { fontSize: 15, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
  },
  switchTextContainer: { flex: 1 },
  switchLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  switchSubtitle: { fontSize: 12, color: "#8A7A6E" },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
