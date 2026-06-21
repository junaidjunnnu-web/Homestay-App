import {
  ActivityIndicator,
  Clipboard,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostDashboard, useGetHostBookings, useGetHostProperties } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const CHART_W = width - 48;
const CHART_H = 140;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getMonthlyRevenue(bookings: any[]) {
  const now = new Date();
  const result: { month: string; revenue: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = MONTHS[d.getMonth()]!;
    const filtered = bookings.filter(b => {
      const bDate = b.checkIn?.slice(0, 7);
      return bDate === key && b.status !== "cancelled";
    });
    result.push({
      month: label,
      revenue: filtered.reduce((s, b) => s + (b.totalAmount || 0), 0),
      count: filtered.length,
    });
  }
  return result;
}

function getRoomOccupancy(bookings: any[]) {
  const map = new Map<string, { name: string; nights: number }>();
  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const ci = new Date(b.checkIn + "T00:00:00");
    if (ci < monthAgo) continue;
    const co = new Date(b.checkOut + "T00:00:00");
    const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
    const key = b.room?.id || b.roomId;
    const name = b.room?.name || "Unknown Room";
    if (!map.has(key)) map.set(key, { name, nights: 0 });
    map.get(key)!.nights += nights;
  }
  return Array.from(map.values()).sort((a, b) => b.nights - a.nights).slice(0, 6);
}

export default function FinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"overview" | "payments">("overview");

  const { data: stats, isLoading } = useGetHostDashboard();
  const { data: allBookings = [] } = useGetHostBookings({});
  const { data: properties = [] } = useGetHostProperties();

  const monthlyData = useMemo(() => getMonthlyRevenue(allBookings as any[]), [allBookings]);
  const roomOccupancy = useMemo(() => getRoomOccupancy(allBookings as any[]), [allBookings]);

  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);
  const maxNights = Math.max(...roomOccupancy.map(r => r.nights), 1);

  const totalRevenue = (allBookings as any[]).filter(b => b.status !== "cancelled").reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const confirmedCount = (allBookings as any[]).filter(b => b.status === "confirmed").length;
  const pendingCount = (allBookings as any[]).filter(b => b.status === "pending").length;
  const cancelledCount = (allBookings as any[]).filter(b => b.status === "cancelled").length;
  const avgBookingValue = confirmedCount > 0 ? Math.round(totalRevenue / confirmedCount) : 0;

  const firstProp = (properties as any[])[0];
  const upiId = firstProp?.upiId || "";
  const bankDetails = firstProp?.bankDetails || "";

  const shareReport = async () => {
    const lines = [
      "📊 HOMESTAY REVENUE REPORT",
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      "",
      "── SUMMARY ──",
      `Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}`,
      `This Month: ₹${(stats?.revenueThisMonth || 0).toLocaleString("en-IN")}`,
      `Avg Booking Value: ₹${avgBookingValue.toLocaleString("en-IN")}`,
      `Confirmed: ${confirmedCount} | Pending: ${pendingCount} | Cancelled: ${cancelledCount}`,
      "",
      "── MONTHLY REVENUE ──",
      ...monthlyData.map(m => `${m.month}: ₹${m.revenue.toLocaleString("en-IN")} (${m.count} bookings)`),
      "",
      "── ROOM OCCUPANCY (last 30 days) ──",
      ...roomOccupancy.map(r => `${r.name}: ${r.nights} nights`),
    ];
    try {
      await Share.share({ message: lines.join("\n"), title: "Homestay Revenue Report" });
    } catch {}
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Finance</Text>
            <Text style={styles.headerSub}>Earnings & Analytics</Text>
          </View>
          <Pressable style={styles.shareBtn} onPress={shareReport}>
            <Feather name="share-2" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share Report</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(["overview", "payments"] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "overview" ? "Overview" : "Payments"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {tab === "overview" && (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.kpiIcon, { backgroundColor: "#10B98115" }]}>
                  <Feather name="trending-up" size={18} color="#10B981" />
                </View>
                <Text style={styles.kpiValue}>₹{(stats?.revenueThisMonth || 0).toLocaleString("en-IN")}</Text>
                <Text style={styles.kpiLabel}>This Month</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="dollar-sign" size={18} color={colors.primary} />
                </View>
                <Text style={styles.kpiValue}>₹{totalRevenue.toLocaleString("en-IN")}</Text>
                <Text style={styles.kpiLabel}>Total Revenue</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.kpiIcon, { backgroundColor: "#3B82F615" }]}>
                  <Feather name="tag" size={18} color="#3B82F6" />
                </View>
                <Text style={styles.kpiValue}>₹{avgBookingValue.toLocaleString("en-IN")}</Text>
                <Text style={styles.kpiLabel}>Avg/Booking</Text>
              </View>
            </View>

            {/* Booking Status Strip */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={styles.sectionTitle}>BOOKING STATUS</Text>
              <View style={styles.statusRow}>
                {[
                  { label: "Confirmed", count: confirmedCount, color: "#10B981" },
                  { label: "Pending", count: pendingCount, color: "#F59E0B" },
                  { label: "Cancelled", count: cancelledCount, color: "#EF4444" },
                ].map(({ label, count, color }) => (
                  <View key={label} style={styles.statusItem}>
                    <Text style={[styles.statusCount, { color }]}>{count}</Text>
                    <Text style={styles.statusLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Monthly Revenue Bar Chart */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={styles.sectionTitle}>MONTHLY REVENUE</Text>
              <View style={[styles.chartArea, { height: CHART_H }]}>
                {monthlyData.map((m, i) => {
                  const barH = maxRev === 0 ? 4 : Math.max(4, (m.revenue / maxRev) * (CHART_H - 40));
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValue}>
                        {m.revenue >= 1000 ? `₹${Math.round(m.revenue / 1000)}k` : m.revenue > 0 ? `₹${m.revenue}` : ""}
                      </Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height: barH, backgroundColor: colors.primary, opacity: m.revenue > 0 ? 1 : 0.2 }]} />
                      </View>
                      <Text style={styles.barLabel}>{m.month}</Text>
                      {m.count > 0 && (
                        <Text style={[styles.barCount, { color: colors.mutedForeground }]}>{m.count}b</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Room Occupancy */}
            {roomOccupancy.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={styles.sectionTitle}>ROOM OCCUPANCY · LAST 30 DAYS</Text>
                {roomOccupancy.map((r, i) => (
                  <View key={i} style={styles.occRow}>
                    <Text style={styles.occName} numberOfLines={1}>{r.name}</Text>
                    <View style={[styles.occTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.occBar,
                          { width: `${Math.round((r.nights / maxNights) * 100)}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={[styles.occNights, { color: colors.primary }]}>{r.nights}n</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Transactions */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
              {(allBookings as any[]).filter(b => b.status !== "cancelled").slice(0, 5).map((b: any) => (
                <View key={b.id} style={[styles.txRow, { borderColor: colors.border }]}>
                  <View style={[styles.txIcon, { backgroundColor: b.status === "confirmed" ? "#10B98115" : colors.warning + "15" }]}>
                    <Feather name="arrow-down-left" size={14} color={b.status === "confirmed" ? "#10B981" : colors.warning} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName} numberOfLines={1}>{b.guestName}</Text>
                    <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{b.checkIn} · #{b.referenceNumber}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: b.status === "confirmed" ? "#10B981" : colors.warning }]}>
                      +₹{b.totalAmount?.toLocaleString("en-IN")}
                    </Text>
                    <Text style={[styles.txStatus, { color: colors.mutedForeground }]}>{b.status}</Text>
                  </View>
                </View>
              ))}
              {(allBookings as any[]).filter(b => b.status !== "cancelled").length === 0 && (
                <Text style={[styles.emptyTx, { color: colors.mutedForeground }]}>No transactions yet</Text>
              )}
            </View>
          </>
        )}

        {tab === "payments" && (
          <>
            {/* UPI Section */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.payMethodHeader}>
                <View style={[styles.payMethodIcon, { backgroundColor: "#6366F115" }]}>
                  <Ionicons name="qr-code-outline" size={22} color="#6366F1" />
                </View>
                <View>
                  <Text style={styles.payMethodTitle}>UPI Payment</Text>
                  <Text style={[styles.payMethodSub, { color: colors.mutedForeground }]}>
                    Guests pay via any UPI app
                  </Text>
                </View>
              </View>

              {upiId ? (
                <>
                  <View style={[styles.upiIdBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={styles.upiIdText}>{upiId}</Text>
                    <Pressable
                      onPress={() => { Clipboard.setString(upiId); }}
                      style={[styles.copyBtn, { borderColor: colors.primary }]}
                    >
                      <Feather name="copy" size={14} color={colors.primary} />
                      <Text style={[styles.copyBtnText, { color: colors.primary }]}>Copy</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.payAppLabel}>Guests can pay with:</Text>
                  <View style={styles.payAppsRow}>
                    {[
                      { name: "PhonePe", color: "#5F259F", bg: "#5F259F15", icon: "📱" },
                      { name: "GPay", color: "#1A73E8", bg: "#1A73E815", icon: "💳" },
                      { name: "Paytm", color: "#00BAF2", bg: "#00BAF215", icon: "🅿️" },
                      { name: "BHIM", color: "#0B4EA2", bg: "#0B4EA215", icon: "🏛️" },
                    ].map(app => (
                      <Pressable
                        key={app.name}
                        style={[styles.payAppChip, { backgroundColor: app.bg, borderColor: app.color + "40" }]}
                        onPress={() => {
                          const upiUrl = `upi://pay?pa=${upiId}&pn=Homestay&cu=INR`;
                          Linking.openURL(upiUrl).catch(() => {});
                        }}
                      >
                        <Text style={styles.payAppIcon}>{app.icon}</Text>
                        <Text style={[styles.payAppName, { color: app.color }]}>{app.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <View style={[styles.setupBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="alert-circle" size={20} color={colors.warning} />
                  <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
                    No UPI ID configured. Add it in your property settings.
                  </Text>
                </View>
              )}
            </View>

            {/* Bank Transfer Section */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.payMethodHeader}>
                <View style={[styles.payMethodIcon, { backgroundColor: "#10B98115" }]}>
                  <Feather name="credit-card" size={22} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.payMethodTitle}>Bank Transfer</Text>
                  <Text style={[styles.payMethodSub, { color: colors.mutedForeground }]}>
                    NEFT / IMPS / RTGS
                  </Text>
                </View>
              </View>

              {bankDetails ? (
                <View style={[styles.bankBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={styles.bankDetailsText}>{bankDetails}</Text>
                  <Pressable
                    style={[styles.copyBtn, { borderColor: colors.primary, marginTop: 10, alignSelf: "flex-start" }]}
                    onPress={() => Clipboard.setString(bankDetails)}
                  >
                    <Feather name="copy" size={14} color={colors.primary} />
                    <Text style={[styles.copyBtnText, { color: colors.primary }]}>Copy Details</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.setupBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="alert-circle" size={20} color={colors.warning} />
                  <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
                    No bank account configured. Add bank details in your property settings.
                  </Text>
                </View>
              )}
            </View>

            {/* Cash Section */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.payMethodHeader}>
                <View style={[styles.payMethodIcon, { backgroundColor: "#F59E0B15" }]}>
                  <Feather name="dollar-sign" size={22} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.payMethodTitle}>Cash Payment</Text>
                  <Text style={[styles.payMethodSub, { color: colors.mutedForeground }]}>
                    Pay directly at the property
                  </Text>
                </View>
              </View>
              <View style={[styles.infoBox, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B30" }]}>
                <Text style={[styles.infoText, { color: "#92400E" }]}>
                  💡 Cash payments are accepted at check-in. Guests should carry exact amount in INR.
                </Text>
              </View>
            </View>

            {/* Payment Tips */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={styles.sectionTitle}>PAYMENT TIPS</Text>
              {[
                "Always collect payment within 24 hours of check-in confirmation.",
                "Send WhatsApp receipt to guests after payment received.",
                "UPI is fastest — most guests prefer PhonePe or GPay.",
                "For groups above ₹10,000, bank transfer is recommended.",
              ].map((tip, i) => (
                <View key={i} style={[styles.tipRow, { borderColor: colors.border }]}>
                  <View style={[styles.tipNum, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={[styles.tipNumText, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  shareBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  tabRow: { flexDirection: "row", gap: 4, paddingBottom: 0 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  tabTextActive: { color: "#fff" },
  scroll: { paddingTop: 20 },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  kpiCard: { flex: 1, padding: 14, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  kpiValue: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  kpiLabel: { fontSize: 10, color: "#8A7A6E", fontWeight: "600" },
  section: { marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#8A7A6E", letterSpacing: 1, marginBottom: 14 },
  statusRow: { flexDirection: "row" },
  statusItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  statusCount: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  statusLabel: { fontSize: 11, color: "#8A7A6E", fontWeight: "600" },
  chartArea: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 8, color: "#8A7A6E", fontWeight: "700", height: 14 },
  barTrack: { width: "100%", alignItems: "center" },
  bar: { width: "80%", borderRadius: 4 },
  barLabel: { fontSize: 10, color: "#8A7A6E", fontWeight: "700" },
  barCount: { fontSize: 8, fontWeight: "600" },
  occRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  occName: { width: 90, fontSize: 12, fontWeight: "600" },
  occTrack: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  occBar: { height: 10, borderRadius: 5 },
  occNights: { width: 28, fontSize: 12, fontWeight: "800", textAlign: "right" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: "700" },
  txDate: { fontSize: 11, marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontWeight: "800" },
  txStatus: { fontSize: 10, marginTop: 2, textTransform: "uppercase", fontWeight: "600" },
  emptyTx: { textAlign: "center", paddingVertical: 20, fontSize: 14 },
  payMethodHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  payMethodIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  payMethodTitle: { fontSize: 16, fontWeight: "800" },
  payMethodSub: { fontSize: 12, marginTop: 2 },
  upiIdBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  upiIdText: { fontSize: 14, fontWeight: "700", flex: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  copyBtnText: { fontSize: 12, fontWeight: "700" },
  payAppLabel: { fontSize: 12, color: "#8A7A6E", fontWeight: "600", marginBottom: 10 },
  payAppsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  payAppChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  payAppIcon: { fontSize: 16 },
  payAppName: { fontSize: 13, fontWeight: "700" },
  setupBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  setupText: { flex: 1, fontSize: 13, lineHeight: 18 },
  bankBox: { padding: 14, borderRadius: 12, borderWidth: 1 },
  bankDetailsText: { fontSize: 13, lineHeight: 22, fontFamily: "monospace" },
  infoBox: { padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { fontSize: 13, lineHeight: 20 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  tipNum: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 1 },
  tipNumText: { fontSize: 12, fontWeight: "800" },
  tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
