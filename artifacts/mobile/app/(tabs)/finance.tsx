import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostDashboard, useGetHostProperties } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function FinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { data: stats, isLoading: isLoadingStats } = useGetHostDashboard();
  const { data: properties } = useGetHostProperties();

  if (isLoadingStats) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const upiId = properties?.[0]?.upiId || "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Finance</Text>
        <Text style={styles.headerSub}>Earnings & Payments</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#10B98115" }]}>
              <Feather name="trending-up" size={20} color="#10B981" />
            </View>
            <Text style={styles.summaryValue}>₹{(stats?.revenueThisMonth || 0).toLocaleString("en-IN")}</Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#3B82F615" }]}>
              <Feather name="pie-chart" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.summaryValue}>₹{(stats?.revenueThisMonth || 0).toLocaleString("en-IN")}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BOOKING STATUS</Text>
          <View style={[styles.statusGrid, { backgroundColor: colors.surface }]}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusCount, { color: colors.primary }]}>{stats?.recentBookings?.filter(b => b.status === "confirmed").length || 0}</Text>
              <Text style={styles.statusLabel}>Confirmed</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusCount, { color: "#F59E0B" }]}>{stats?.pendingBookings || 0}</Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusCount, { color: colors.destructive }]}>0</Text>
              <Text style={styles.statusLabel}>Cancelled</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT SETTINGS</Text>
          <View style={[styles.upiCard, { backgroundColor: colors.surface }]}>
            <View style={styles.upiHeader}>
              <View style={[styles.upiIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.upiTitle}>UPI Payment ID</Text>
                <Text style={styles.upiSub}>{upiId || "Not configured"}</Text>
              </View>
            </View>
            {upiId ? (
              <Pressable style={[styles.copyBtn, { borderColor: colors.primary }]}>
                <Text style={[styles.copyBtnText, { color: colors.primary }]}>Copy ID</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.setupBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.setupBtnText}>Set up UPI</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.upiHint}>
            This UPI ID will be shared with guests for direct payments after booking confirmation.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  scrollContent: {
    paddingTop: 20,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginTop: -30,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#8A7A6E",
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statusItem: {
    flex: 1,
    alignItems: "center",
  },
  statusCount: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: "#8A7A6E",
  },
  statusDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#EEE",
    alignSelf: "center",
  },
  upiCard: {
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  upiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  upiIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  upiTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  upiSub: {
    fontSize: 13,
    color: "#8A7A6E",
    marginTop: 2,
  },
  copyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  setupBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setupBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  upiHint: {
    fontSize: 12,
    color: "#8A7A6E",
    fontStyle: "italic",
    marginTop: 10,
    lineHeight: 18,
  },
});
