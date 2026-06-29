import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Clipboard,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const PAYMENT_METHODS = ["all", "cash", "upi", "bank_transfer", "card", "google_pay", "phonepe", "paytm"];
const STATUSES = ["all", "pending", "completed", "failed", "refunded"];

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["transactions", statusFilter, methodFilter],
    queryFn: async () => {
      const token = await fetchToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (methodFilter !== "all") params.append("paymentMethod", methodFilter);
      
      const response = await fetch(`${API_BASE}/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!user,
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

  const exportToCSV = async () => {
    if (!transactions || transactions.length === 0) {
      Alert.alert("No Data", "No transactions to export");
      return;
    }

    const headers = ["Date", "Booking Reference", "Guest Name", "Amount", "Payment Method", "Status", "Transaction ID"];
    const rows = transactions.map((t: any) => [
      new Date(t.createdAt).toLocaleDateString("en-IN"),
      t.booking?.referenceNumber || "N/A",
      t.guest?.name || "N/A",
      t.amount,
      t.paymentMethod,
      t.status,
      t.transactionId || "N/A",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    
    try {
      Clipboard.setString(csvContent);
      Alert.alert("CSV Copied", "Transaction data copied to clipboard. Paste in Excel/Google Sheets.");
    } catch (error) {
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      upi: "UPI",
      bank_transfer: "Bank Transfer",
      card: "Card",
      google_pay: "Google Pay",
      phonepe: "PhonePe",
      paytm: "Paytm",
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#10B981";
      case "pending": return "#F59E0B";
      case "failed": return "#EF4444";
      case "refunded": return "#6366F1";
      default: return colors.mutedForeground;
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text>Please log in</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: "#E8824A" }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Pressable onPress={exportToCSV}>
          <Feather name="download" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#E8824A" />}
      >
        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {STATUSES.map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && { backgroundColor: "#E8824A" },
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterChipText, statusFilter === status && { color: "#fff" }]}>
                  {status.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method}
                style={[
                  styles.filterChip,
                  methodFilter === method && { backgroundColor: "#E8824A" },
                ]}
                onPress={() => setMethodFilter(method)}
              >
                <Text style={[styles.filterChipText, methodFilter === method && { color: "#fff" }]}>
                  {method === "all" ? "All" : getPaymentMethodLabel(method)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Transactions List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#E8824A" style={{ marginTop: 60 }} />
        ) : transactions?.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Feather name="credit-card" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions found
            </Text>
          </View>
        ) : (
          transactions?.map((transaction: any) => (
            <View
              key={transaction.id}
              style={[styles.transactionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.transactionHeader}>
                <View style={[styles.refBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.refText, { color: colors.primary }]}>
                    #{transaction.booking?.referenceNumber || "N/A"}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                    {transaction.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.transactionDetails}>
                <Text style={styles.guestName}>{transaction.guest?.name || "Unknown Guest"}</Text>
                <Text style={[styles.methodText, { color: colors.mutedForeground }]}>
                  {getPaymentMethodLabel(transaction.paymentMethod)}
                </Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={[styles.amount, { color: "#10B981" }]}>
                  +₹{transaction.amount?.toLocaleString("en-IN")}
                </Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {new Date(transaction.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>

              {transaction.transactionId && (
                <View style={[styles.transactionIdRow, { backgroundColor: colors.background }]}>
                  <Text style={[styles.transactionIdLabel, { color: colors.mutedForeground }]}>
                    Transaction ID:
                  </Text>
                  <Text style={styles.transactionIdValue}>{transaction.transactionId}</Text>
                </View>
              )}

              {transaction.proofUrl && (
                <Pressable style={[styles.proofBtn, { borderColor: colors.border }]}>
                  <Feather name="image" size={16} color={colors.primary} />
                  <Text style={[styles.proofBtnText, { color: colors.primary }]}>View Proof</Text>
                </Pressable>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
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
  filtersSection: { marginBottom: 20 },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A6E",
    marginBottom: 8,
    marginLeft: 5,
  },
  filterScroll: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E8824A",
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#E8824A" },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 16,
  },
  transactionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  refBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  transactionDetails: {
    marginBottom: 12,
  },
  guestName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  methodText: {
    fontSize: 13,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amount: {
    fontSize: 18,
    fontWeight: "800",
  },
  date: {
    fontSize: 12,
  },
  transactionIdRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionIdLabel: {
    fontSize: 11,
    marginRight: 8,
  },
  transactionIdValue: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  proofBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  proofBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
