import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostDashboard, useGetHostBookings, useGetHostProperties } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

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
      const bDate = b.createdAt?.slice(0, 7) || b.checkIn?.slice(0, 7);
      return bDate === key && b.status !== "cancelled";
    });
    result.push({
      month: label,
      revenue: filtered.reduce((s, b) => s + (b.paidAmount || 0), 0),
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
  const { user } = useAuth();
  const [tab, setTab] = useState<"overview" | "expenses" | "payments">("overview");
  const [plModalVisible, setPlModalVisible] = useState(false);

  const { data: stats, isLoading } = useGetHostDashboard();
  const { data: allBookings = [] } = useGetHostBookings({});
  const { data: properties = [] } = useGetHostProperties();

  const { data: paymentDashboard, isLoading: loadingPayments } = useQuery({
    queryKey: ["paymentDashboard"],
    queryFn: async () => {
      const response = await apiFetch("/transactions/dashboard");
      if (!response.ok) throw new Error("Failed to fetch payment dashboard");
      return response.json();
    },
    enabled: !!user && user.role === "host",
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions", "finance"],
    queryFn: async () => {
      const response = await apiFetch("/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!user && user.role === "host",
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ["paymentSettings"],
    queryFn: async () => {
      const response = await apiFetch("/payment-settings");
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user && user.role === "host",
  });

  const monthlyData = useMemo(() => getMonthlyRevenue(allBookings as any[]), [allBookings]);
  const roomOccupancy = useMemo(() => getRoomOccupancy(allBookings as any[]), [allBookings]);

  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);
  const maxNights = Math.max(...roomOccupancy.map(r => r.nights), 1);

  const totalRevenue = (allBookings as any[]).filter(b => b.status !== "cancelled").reduce((s: number, b: any) => s + (b.paidAmount || 0), 0);
  const totalBookingsValue = (allBookings as any[]).filter(b => b.status !== "cancelled").reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const pendingCollections = totalBookingsValue - totalRevenue;
  const confirmedCount = (allBookings as any[]).filter(b => b.status === "confirmed" || b.status === "checked_in").length;
  const pendingCount = (allBookings as any[]).filter(b => b.status === "pending").length;
  const cancelledCount = (allBookings as any[]).filter(b => b.status === "cancelled").length;
  const avgBookingValue = confirmedCount > 0 ? Math.round(totalBookingsValue / confirmedCount) : 0;

  const expenses: { id: string; category: string; amount: number }[] = [];
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const gstAmount = totalRevenue * 0.18;
  const revenueAfterGST = totalRevenue - gstAmount;

  const upiId = paymentSettings?.upiId || (properties as any[])[0]?.upiId || "";
  const bankDetails = paymentSettings?.bankDetails
    ? `${paymentSettings.bankDetails.bankName || ""}\nA/C: ${paymentSettings.bankDetails.accountNumber || ""}`
    : (properties as any[])[0]?.bankDetails || "";

  const propertyTimeline = useMemo(() => {
    return (properties as any[])
      .map((p) => ({
        id: p.id,
        name: p.name,
        date: p.createdAt?.slice(0, 10) || "—",
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [properties]);

  const shareReport = async () => {
    const lines = [
      "📊 HOMESTAY REVENUE REPORT",
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      "",
      "── SUMMARY ──",
      `Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}`,
      `Total Expenses: ₹${totalExpenses.toLocaleString("en-IN")}`,
      `Net Profit: ₹${netProfit.toLocaleString("en-IN")}`,
      `GST (18%): ₹${gstAmount.toLocaleString("en-IN")}`,
      `Revenue After GST: ₹${revenueAfterGST.toLocaleString("en-IN")}`,
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

  if (!user || user.role !== "host") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}> 
        <Text style={{ color: colors.foreground }}>Access denied. Host account required.</Text>
      </View>
    );
  }

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
          {(["overview", "expenses", "payments"] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "overview" ? "Overview" : t === "expenses" ? "Expenses" : "Payments"}
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
                <View style={[styles.kpiIcon, { backgroundColor: netProfit >= 0 ? "#10B98115" : "#EF444415" }]}>
                  <Feather name="pie-chart" size={18} color={netProfit >= 0 ? "#10B981" : "#EF4444"} />
                </View>
                <Text style={styles.kpiValue}>₹{netProfit.toLocaleString("en-IN")}</Text>
                <Text style={styles.kpiLabel}>Net Profit</Text>
              </View>
            </View>

            {/* P&L Summary */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>PROFIT & LOSS SUMMARY</Text>
                <Pressable onPress={() => setPlModalVisible(true)}>
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>View Details →</Text>
                </Pressable>
              </View>
              <View style={styles.plRow}>
                <View style={styles.plItem}>
                  <Text style={[styles.plLabel, { color: colors.mutedForeground }]}>Total Revenue</Text>
                  <Text style={[styles.plValue, { color: "#10B981" }]}>₹{totalRevenue.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.plItem}>
                  <Text style={[styles.plLabel, { color: colors.mutedForeground }]}>Total Expenses</Text>
                  <Text style={[styles.plValue, { color: "#EF4444" }]}>₹{totalExpenses.toLocaleString("en-IN")}</Text>
                </View>
              </View>
              <View style={[styles.plDivider, { backgroundColor: colors.border }]} />
              <View style={styles.plRow}>
                <View style={styles.plItem}>
                  <Text style={[styles.plLabel, { color: colors.mutedForeground }]}>GST (18%)</Text>
                  <Text style={[styles.plValue, { color: colors.warning }]}>₹{gstAmount.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.plItem}>
                  <Text style={[styles.plLabel, { color: colors.mutedForeground }]}>Net Profit</Text>
                  <Text style={[styles.plValue, { color: netProfit >= 0 ? "#10B981" : "#EF4444" }]}>₹{netProfit.toLocaleString("en-IN")}</Text>
                </View>
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
              {(allTransactions as any[]).slice(0, 5).map((t: any) => (
                <View key={t.id} style={[styles.txRow, { borderColor: colors.border }]}>
                  <View style={[styles.txIcon, { backgroundColor: "#10B98115" }]}>
                    <Feather name="arrow-down-left" size={14} color="#10B981" />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName} numberOfLines={1}>{t.guest?.name || "Guest"}</Text>
                    <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                      {new Date(t.createdAt).toLocaleDateString("en-IN")} · #{t.booking?.referenceNumber || "—"}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: "#10B981" }]}>
                      +₹{t.amount?.toLocaleString("en-IN")}
                    </Text>
                    <Text style={[styles.txStatus, { color: colors.mutedForeground }]}>{t.paymentMethod}</Text>
                  </View>
                </View>
              ))}
              {(allTransactions as any[]).length === 0 && (
                <Text style={[styles.emptyTx, { color: colors.mutedForeground }]}>No transactions yet</Text>
              )}
            </View>
          </>
        )}

        {tab === "expenses" && (
          <>
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={styles.sectionTitle}>PROPERTY TIMELINE</Text>
              <Text style={[styles.emptyExpenses, { color: colors.mutedForeground, marginBottom: 12 }]}>
                Finance data is based on your actual listings and bookings.
              </Text>
              {propertyTimeline.map((p) => (
                <View key={p.id} style={[styles.expenseRow, { borderColor: colors.border }]}>
                  <View style={[styles.expenseIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="home" size={14} color={colors.primary} />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseCategory}>{p.name}</Text>
                    <Text style={[styles.expenseDesc, { color: colors.mutedForeground }]}>Listed on {p.date}</Text>
                  </View>
                </View>
              ))}
              {propertyTimeline.length === 0 && (
                <Text style={[styles.emptyExpenses, { color: colors.mutedForeground }]}>No properties listed yet</Text>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={styles.sectionTitle}>PENDING COLLECTIONS</Text>
              <Text style={[styles.expenseSummaryValue, { color: "#F59E0B", marginBottom: 8 }]}>
                ₹{pendingCollections.toLocaleString("en-IN")}
              </Text>
              <Text style={[styles.emptyExpenses, { color: colors.mutedForeground }]}>
                Outstanding from confirmed bookings not yet fully paid.
              </Text>
            </View>
          </>
        )}

        {tab === "payments" && (
          <>
            {loadingPayments ? (
              <ActivityIndicator size="large" color="#E8824A" style={{ marginTop: 60 }} />
            ) : (
              <>
                {/* Payment Overview Cards */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIcon, { backgroundColor: "#10B98115" }]}>
                      <Feather name="check-circle" size={24} color="#10B981" />
                    </View>
                    <Text style={[styles.statValue, { color: "#10B981" }]}>
                      ₹{paymentDashboard?.totalCollected?.toLocaleString("en-IN") || 0}
                    </Text>
                    <Text style={styles.statLabel}>Total Collected</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIcon, { backgroundColor: "#E8824A15" }]}>
                      <Feather name="clock" size={24} color="#E8824A" />
                    </View>
                    <Text style={[styles.statValue, { color: "#E8824A" }]}>
                      ₹{paymentDashboard?.pendingAmount?.toLocaleString("en-IN") || 0}
                    </Text>
                    <Text style={styles.statLabel}>Pending Amount</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIcon, { backgroundColor: "#3B82F615" }]}>
                      <Feather name="check-square" size={24} color="#3B82F6" />
                    </View>
                    <Text style={[styles.statValue, { color: "#3B82F6" }]}>
                      {paymentDashboard?.completedTransactionsLength || 0}
                    </Text>
                    <Text style={styles.statLabel}>Completed Transactions</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIcon, { backgroundColor: "#F59E0B15" }]}>
                      <Feather name="alert-circle" size={24} color="#F59E0B" />
                    </View>
                    <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                      {paymentDashboard?.pendingTransactionsLength || 0}
                    </Text>
                    <Text style={styles.statLabel}>Pending Transactions</Text>
                  </View>
                </View>

                {/* Pending Bookings */}
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Pending Payments</Text>
                    <View style={[styles.badge, { backgroundColor: "#E8824A" }]}>
                      <Text style={styles.badgeText}>{paymentDashboard?.pendingBookings?.length || 0}</Text>
                    </View>
                  </View>
                  {paymentDashboard?.pendingBookings?.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
                      <Feather name="check-circle" size={48} color="#10B981" />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        All payments collected!
                      </Text>
                    </View>
                  ) : (
                    paymentDashboard?.pendingBookings?.map((booking: any) => (
                      <View key={booking.id} style={[styles.pendingBookingCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.pendingBookingHeader}>
                          <Text style={[styles.refText, { color: colors.primary }]}>#{booking.referenceNumber}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: "#E8824A15" }]}>
                            <Text style={[styles.statusText, { color: "#E8824A" }]}>
                              {booking.paymentStatus?.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.guestName}>{booking.guestName}</Text>
                        <View style={styles.pendingBookingDetails}>
                          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                            Check-in: {booking.checkIn}
                          </Text>
                          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                            Check-out: {booking.checkOut}
                          </Text>
                        </View>
                        <View style={styles.amountRow}>
                          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
                            ₹{(booking.totalAmount || 0).toLocaleString("en-IN")}
                          </Text>
                          <Text style={[styles.paidAmount, { color: "#10B981" }]}>
                            Paid: ₹{(booking.paidAmount || 0).toLocaleString("en-IN")}
                          </Text>
                        </View>
                        <View style={[styles.remainingBar, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.remainingFill,
                              {
                                width: `${((booking.paidAmount || 0) / (booking.totalAmount || 1)) * 100}%`,
                                backgroundColor: "#E8824A",
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Recent Transactions */}
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                  <Text style={styles.sectionTitle}>Recent Transactions</Text>
                  {paymentDashboard?.recentTransactions?.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
                      <Feather name="credit-card" size={48} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        No transactions yet
                      </Text>
                    </View>
                  ) : (
                    paymentDashboard?.recentTransactions?.map((transaction: any) => (
                      <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.transactionLeft}>
                          <View style={[styles.transactionIcon, { backgroundColor: "#10B98115" }]}>
                            <Feather name="arrow-down-left" size={18} color="#10B981" />
                          </View>
                          <View>
                            <Text style={styles.transactionMethod}>
                              {transaction.paymentMethod?.replace("_", " ").toUpperCase()}
                            </Text>
                            <Text style={[styles.transactionRef, { color: colors.mutedForeground }]}>
 #{transaction.booking?.referenceNumber}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.transactionAmount, { color: "#10B981" }]}>
                          +₹{transaction.amount?.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* P&L Modal */}
      <Modal
        visible={plModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPlModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Profit & Loss Statement</Text>
              <Pressable onPress={() => setPlModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={[styles.plSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.plSectionTitle, { color: colors.foreground }]}>REVENUE</Text>
                <Text style={[styles.plSectionValue, { color: "#10B981" }]}>₹{totalRevenue.toLocaleString("en-IN")}</Text>
              </View>
              <View style={[styles.plSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.plSectionTitle, { color: colors.foreground }]}>EXPENSES</Text>
                {expenses.map((e) => (
                  <View key={e.id} style={styles.plExpenseItem}>
                    <Text style={[styles.plExpenseCat, { color: colors.mutedForeground }]}>{e.category}</Text>
                    <Text style={[styles.plExpenseAmt, { color: "#EF4444" }]}>₹{e.amount.toLocaleString("en-IN")}</Text>
                  </View>
                ))}
                <View style={[styles.plDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.plSectionValue, { color: "#EF4444" }]}>₹{totalExpenses.toLocaleString("en-IN")}</Text>
              </View>
              <View style={[styles.plSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.plSectionTitle, { color: colors.foreground }]}>GST (18%)</Text>
                <Text style={[styles.plSectionValue, { color: colors.warning }]}>₹{gstAmount.toLocaleString("en-IN")}</Text>
              </View>
              <View style={[styles.plSection, { backgroundColor: colors.background, borderColor: colors.primary, borderWidth: 2 }]}>
                <Text style={[styles.plSectionTitle, { color: colors.foreground }]}>NET PROFIT</Text>
                <Text style={[styles.plSectionValue, { color: netProfit >= 0 ? "#10B981" : "#EF4444" }]}>
                  ₹{netProfit.toLocaleString("en-IN")}
                </Text>
              </View>
            </ScrollView>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={() => setPlModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  viewAllText: { fontSize: 11, fontWeight: "700" },
  plRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  plItem: { flex: 1 },
  plLabel: { fontSize: 11, color: "#8A7A6E", marginBottom: 4 },
  plValue: { fontSize: 16, fontWeight: "800" },
  plDivider: { height: 1, marginVertical: 12 },
  expenseSummaryRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  expenseSummaryItem: { flex: 1 },
  expenseSummaryLabel: { fontSize: 11, color: "#8A7A6E", marginBottom: 4 },
  expenseSummaryValue: { fontSize: 18, fontWeight: "800" },
  addExpenseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  addExpenseBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1 },
  expenseIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  expenseInfo: { flex: 1 },
  expenseCategory: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  expenseDesc: { fontSize: 12, marginBottom: 2 },
  expenseDate: { fontSize: 11 },
  expenseRight: { alignItems: "flex-end" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#8A7A6E", fontWeight: "600" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 24, alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyState: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#8A7A6E", marginTop: 12 },
  pendingBookingCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  pendingBookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  refText: { fontSize: 13, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  guestName: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  pendingBookingDetails: { flexDirection: "row", gap: 16, marginBottom: 8 },
  detailText: { fontSize: 12 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  totalAmount: { fontSize: 16, fontWeight: "800" },
  paidAmount: { fontSize: 14, fontWeight: "600" },
  remainingBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  remainingFill: { height: "100%", borderRadius: 3 },
  transactionCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  transactionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  transactionMethod: { fontSize: 14, fontWeight: "700" },
  transactionRef: { fontSize: 11, marginTop: 2 },
  transactionAmount: { fontSize: 15, fontWeight: "800" },
  expenseAmount: { fontSize: 14, fontWeight: "800" },
  emptyExpenses: { textAlign: "center", paddingVertical: 20, fontSize: 14 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  catName: { width: 90, fontSize: 12, fontWeight: "600" },
  catTrack: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  catBar: { height: 10, borderRadius: 5 },
  catAmount: { width: 80, fontSize: 12, fontWeight: "800", textAlign: "right" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalScroll: { maxHeight: 300, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  categoryScroll: { marginBottom: 16 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  plSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  plSectionTitle: { fontSize: 12, fontWeight: "800", marginBottom: 8 },
  plSectionValue: { fontSize: 20, fontWeight: "800" },
  plExpenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  plExpenseCat: { fontSize: 13 },
  plExpenseAmt: { fontSize: 13, fontWeight: "600" },
});
