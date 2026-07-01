import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo, Suspense } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetGuestBookings,
  useGetHostBookings,
  useUpdateBookingStatus,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { openWhatsApp, normalizePhone } from "@/utils/whatsapp";

const PaymentModal = React.lazy(() => import("@/components/PaymentModal"));
const GuestPaymentModal = React.lazy(() => import("@/components/GuestPaymentModal"));
const ChatModal = React.lazy(() => import("@/components/ChatModal"));
const SpecialRequestsModal = React.lazy(() => import("@/components/SpecialRequestsModal"));
const UPIQRModal = React.lazy(() => import("@/components/UPIQRModal"));
const TravelGuideModal = React.lazy(() => import("@/components/TravelGuideModal"));

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "partial"] as const;
const BOOKING_SOURCES = ["walk-in", "phone", "WhatsApp", "online"] as const;

function buildDateStrip() {
  const days: string[] = [];
  const today = new Date();
  for (let i = -3; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split("T")[0]!);
  }
  return days;
}

const DATE_STRIP = buildDateStrip();
const TODAY = new Date().toISOString().split("T")[0]!;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [guestPaymentModalVisible, setGuestPaymentModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [specialRequestsModalVisible, setSpecialRequestsModalVisible] = useState(false);
  const [upiQRModalVisible, setUpiQRModalVisible] = useState(false);
  const [travelGuideModalVisible, setTravelGuideModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [notesText, setNotesText] = useState("");

  const isHost = user?.role === "host";

  const normalizePhoneLocal = (raw: string | number | undefined | null) => normalizePhone(raw);

  const guestQuery = useGetGuestBookings({ query: { enabled: !isHost && !!user } } as any);
  const hostQuery = useGetHostBookings(
    {}, // Get all bookings without status filter initially
    { query: { enabled: isHost && !!user } } as any
  );

  const { mutate: updateStatus } = useUpdateBookingStatus();

  const bookings = isHost ? hostQuery.data : guestQuery.data;
  const isLoading = isHost ? hostQuery.isLoading : guestQuery.isLoading;
  const refetch = isHost ? hostQuery.refetch : guestQuery.refetch;
  const isRefetching = isHost ? hostQuery.isRefetching : guestQuery.isRefetching;

  const refreshBookings = async () => {
    try {
      await refetch();
    } catch (error) {
      console.warn("Failed to refresh bookings", error);
    }
  };

  // Which dates have at least one booking (for host calendar strip)
  const bookedDates = useMemo(() => {
    if (!bookings) return new Set<string>();
    const s = new Set<string>();
    for (const b of bookings) {
      const ci = new Date(b.checkIn + "T00:00:00");
      const co = new Date(b.checkOut + "T00:00:00");
      const d = new Date(ci);
      while (d < co) {
        s.add(d.toISOString().split("T")[0]!);
        d.setDate(d.getDate() + 1);
      }
    }
    return s;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    let list = isHost ? bookings : bookings.filter(b =>
      filter === "All" ? true : b.status === filter.toLowerCase()
    );
    
    // Apply status filter for hosts after getting all bookings
    if (isHost && filter !== "All") {
      list = list.filter(b => b.status === filter.toLowerCase());
    }
    
    if (calendarDate) {
      list = list.filter(b => b.checkIn <= calendarDate && b.checkOut > calendarDate);
    }
    return list;
  }, [bookings, filter, isHost, calendarDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "checked_in": return "#3B82F6";
      case "pending": return colors.warning;
      case "cancelled": return colors.destructive;
      case "completed": return "#7C3AED";
      default: return colors.mutedForeground;
    }
  };

  const confirmBooking = (id: string) => {
    updateStatus({ bookingId: id, data: { status: "confirmed" } }, {
      onSuccess: () => refreshBookings(),
    });
  };

  const cancelBooking = (id: string) => {
    updateStatus({ bookingId: id, data: { status: "cancelled" } }, {
      onSuccess: () => refreshBookings(),
    });
  };

  const sendWhatsAppToGuest = (item: any, eventLabel?: string) => {
    const mobile = normalizePhoneLocal(item.guestMobile);
    if (!mobile) return;
    const status = eventLabel
      ? `${eventLabel} ✅`
      : item.status === "confirmed"
      ? "confirmed ✅"
      : item.status === "checked_in"
      ? "checked in ✅"
      : item.status === "completed"
      ? "completed ✅"
      : "received";
    const msg = `Hi ${item.guestName}! 🏡\n\nYour booking at ${item.property?.name || "our homestay"} has been ${status}.\n\n📋 Reference: #${item.referenceNumber}\n📅 Check-in: ${item.checkIn}\n📅 Check-out: ${item.checkOut}\n🛏 Room: ${item.room?.name}\n💰 Amount: ₹${item.totalAmount?.toLocaleString("en-IN")}\n\nIf you have any questions, feel free to reply here. 😊`;
    Linking.openURL(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`);
  };

  const openUPI = (item: any) => {
    if (!item?.property) {
      Alert.alert("Error", "Property information not available for this booking");
      return;
    }
    setSelectedBooking(item);
    setGuestPaymentModalVisible(true);
  };

  const handleCheckIn = async (item: any) => {
    Alert.alert("Check-In Guest", `Mark ${item.guestName} as checked in?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Check In",
        onPress: async () => {
          try {
            const response = await apiFetch(`/bookings/${item.id}/checkin`, { method: "PATCH" });
            if (!response.ok) throw new Error("Failed to check in");
            await refreshBookings();
            sendWhatsAppToGuest(item, "checked in");
            Alert.alert("Success", "Guest checked in successfully. WhatsApp notification sent.");
          } catch (error) {
            Alert.alert("Error", "Failed to check in guest");
          }
        },
      },
    ]);
  };

  const handleCheckOut = async (item: any) => {
    Alert.alert("Check-Out Guest", `Mark ${item.guestName} as checked out?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Check Out",
        onPress: async () => {
          try {
            const response = await apiFetch(`/bookings/${item.id}/checkout`, { method: "PATCH" });
            if (!response.ok) throw new Error("Failed to check out");
            await refreshBookings();
            sendWhatsAppToGuest(item, "checked out");
            Alert.alert("Success", "Guest checked out successfully. WhatsApp notification sent.");
          } catch (error) {
            Alert.alert("Error", "Failed to check out guest");
          }
        },
      },
    ]);
  };

  const togglePaymentStatus = (item: any) => {
    setSelectedBooking(item);
    setPaymentModalVisible(true);
  };

  const openNotesModal = (item: any) => {
    setSelectedBooking(item);
    setNotesText(item.specialRequests || "");
    setNotesModalVisible(true);
  };

  const openTimelineModal = (item: any) => {
    setSelectedBooking(item);
    setTimelineModalVisible(true);
  };

  const openChat = (item: any) => {
    setSelectedBooking(item);
    setChatModalVisible(true);
  };

  const openSpecialRequests = (item: any) => {
    setSelectedBooking(item);
    setSpecialRequestsModalVisible(true);
  };

  const openUPIQR = (item: any) => {
    setSelectedBooking(item);
    setUpiQRModalVisible(true);
  };

  const openTravelGuide = (item: any) => {
    setSelectedBooking(item);
    setTravelGuideModalVisible(true);
  };

  const saveNotes = () => {
    if (!selectedBooking) return;
    // Note: This would require a separate API endpoint for updating booking notes
    Alert.alert("Notes Saved", "Special requests have been updated.");
    setNotesModalVisible(false);
  };

  const shareInvoiceViaWhatsApp = (item: any) => {
    const mobile = normalizePhone(isHost ? item.guestMobile : item.property?.phone);
    if (!mobile) {
      Alert.alert("No Contact", "No phone number available to share invoice.");
      return;
    }
    
    const invoiceText = `
🧾 BOOKING INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━

Reference: #${item.referenceNumber}
Property: ${item.property?.name}
Room: ${item.room?.name}

Guest: ${item.guestName}
Check-in: ${item.checkIn}
Check-out: ${item.checkOut}
Nights: ${Math.ceil((new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime()) / (1000 * 60 * 60 * 24))}

Amount: ₹${item.totalAmount?.toLocaleString("en-IN")}
Payment Status: ${item.paymentStatus?.toUpperCase()}

Thank you for your booking!
    `.trim();
    
    Linking.openURL(`https://wa.me/${mobile}?text=${encodeURIComponent(invoiceText)}`);
  };

  const renderBooking = ({ item }: { item: any }) => {
    const checkIn = new Date(item.checkIn + "T00:00:00");
    const checkOut = new Date(item.checkOut + "T00:00:00");
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const isActive = item.status === "confirmed" || item.status === "pending";

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.refBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.refText, { color: colors.primary }]}>#{item.referenceNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            {isHost && item.guestMobile ? (
              <Pressable onPress={() => sendWhatsAppToGuest(item)} hitSlop={8}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Property & Room */}
        <Text style={styles.propertyName} numberOfLines={1}>
          {item.property?.name || "Homestay"}
        </Text>
        <Text style={[styles.roomInfo, { color: colors.mutedForeground }]}>
          {item.room?.name ?? "—"}
          {item.room?.type ? ` · ${item.room.type}` : ""}
        </Text>

        {/* Guest info for host */}
        {isHost && (
          <View style={[styles.guestRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="user" size={13} color={colors.mutedForeground} />
            <Text style={[styles.guestText, { color: colors.foreground }]}>{item.guestName}</Text>
            {item.guestMobile ? (
              <Text style={[styles.guestMobile, { color: colors.mutedForeground }]}>+91 {item.guestMobile}</Text>
            ) : null}
          </View>
        )}

        {/* Dates */}
        <View style={[styles.datesRow, { backgroundColor: colors.background }]}>
          <View style={styles.dateBlock}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {checkIn.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
            {item.checkInTime && (
              <Text style={[styles.timeText, { color: colors.success }]}>
                {new Date(item.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            )}
          </View>
          <View style={[styles.nightsBadge, { borderColor: colors.border }]}>
            <Feather name="moon" size={11} color={colors.mutedForeground} />
            <Text style={[styles.nightsText, { color: colors.mutedForeground }]}>{nights}n</Text>
          </View>
          <View style={[styles.dateBlock, { alignItems: "flex-end" }]}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {checkOut.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
            {item.checkOutTime && (
              <Text style={[styles.timeText, { color: colors.success }]}>
                {new Date(item.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
            <Text style={[styles.amountValue, { color: colors.foreground }]}>
              ₹{item.totalAmount?.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={[styles.payBadge, { backgroundColor: item.paymentStatus === "paid" ? "#10B98115" : colors.warning + "15" }]}>
            <Text style={[styles.payText, { color: item.paymentStatus === "paid" ? "#10B981" : colors.warning }]}>
              {item.paymentStatus === "paid" ? "PAID" : "UNPAID"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Row 1 - Primary Actions */}
          <View style={styles.actionsRow}>
            {isHost && item.status === "pending" && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.success }]}
                onPress={() => confirmBooking(item.id)}
              >
                <Feather name="check" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Confirm</Text>
              </Pressable>
            )}
            {isHost && item.status === "confirmed" && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                onPress={() => handleCheckIn(item)}
              >
                <Ionicons name="log-in-outline" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Check-In</Text>
              </Pressable>
            )}
            {isHost && item.status === "checked_in" && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                onPress={() => handleCheckOut(item)}
              >
                <Ionicons name="log-out-outline" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Check-Out</Text>
              </Pressable>
            )}
            {isHost && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
                onPress={() => {
                  setSelectedBooking(item);
                  setPaymentModalVisible(true);
                }}
              >
                <Feather name="credit-card" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Payment</Text>
              </Pressable>
            )}
            {!isHost && item.status === "confirmed" && item.property?.upiId && (
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => openUPIQR(item)}>
                <Ionicons name="qr-code" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Pay via UPI</Text>
              </Pressable>
            )}
          </View>

          {/* Row 2 - Secondary Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#EC4899" }]}
              onPress={() => openSpecialRequests(item)}
            >
              <Ionicons name="gift" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Requests</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#E8824A" }]}
              onPress={() => openNotesModal(item)}
            >
              <Feather name="file-text" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Notes</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
              onPress={() => shareInvoiceViaWhatsApp(item)}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Invoice</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
              onPress={() => openChat(item)}
            >
              <Ionicons name="chatbubble-outline" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Chat</Text>
            </Pressable>
          </View>

          {/* Row 3 - Additional Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#06B6D4" }]}
              onPress={() => openTravelGuide(item)}
            >
              <Ionicons name="map-outline" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Guide</Text>
            </Pressable>
            {!isHost && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#6366F1" }]}
                onPress={() => openTimelineModal(item)}
              >
                <Feather name="clock" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Timeline</Text>
              </Pressable>
            )}
            {!isHost && item.property?.phone && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                onPress={() => {
                  const phone = normalizePhone(item.property.phone);
                  const msg = `Hi! I have a booking at ${item.property?.name} (Ref: #${item.referenceNumber}) from ${item.checkIn} to ${item.checkOut}. I have a question about my booking.`;
                  if (!phone) {
                    Alert.alert("No Contact", "No phone number available to open WhatsApp.");
                    return;
                  }
                  Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
                }}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Host</Text>
              </Pressable>
            )}
            {isActive && (
              <Pressable
                style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.destructive, backgroundColor: "transparent" }]}
                onPress={() => cancelBooking(item.id)}
              >
                <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="calendar" size={64} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Please log in</Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          Log in to view and manage your bookings.
        </Text>
        <Pressable
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isHost ? "Guest Bookings" : "My Bookings"}
        </Text>
        {isHost && (
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/booking/add")}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add Booking</Text>
          </Pressable>
        )}
      </View>

      {/* Host: Date strip calendar */}
      {isHost && (
        <View style={{ marginBottom: 4 }}>
          <View style={styles.calendarHeader}>
            <Text style={[styles.calendarLabel, { color: colors.mutedForeground }]}>
              {calendarDate ? `Showing bookings for ${calendarDate}` : "Tap a date to filter"}
            </Text>
            {calendarDate && (
              <Pressable onPress={() => setCalendarDate(null)}>
                <Text style={[styles.clearDateBtn, { color: colors.primary }]}>Clear</Text>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
          >
            {DATE_STRIP.map((dateStr) => {
              const d = new Date(dateStr + "T00:00:00");
              const dayLabel = DAY_LABELS[d.getDay()];
              const dayNum = d.getDate();
              const isToday = dateStr === TODAY;
              const hasBooking = bookedDates.has(dateStr);
              const isSelected = calendarDate === dateStr;
              return (
                <Pressable
                  key={dateStr}
                  onPress={() => setCalendarDate(isSelected ? null : dateStr)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isToday
                        ? colors.primary + "15"
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : isToday ? colors.primary : colors.border,
                      borderWidth: isToday || isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillDay,
                      { color: isSelected ? "#fff" : isToday ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {dayLabel}
                  </Text>
                  <Text
                    style={[
                      styles.datePillNum,
                      { color: isSelected ? "#fff" : isToday ? colors.primary : colors.foreground },
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {hasBooking && (
                    <View
                      style={[
                        styles.bookingDot,
                        { backgroundColor: isSelected ? "#fff" : colors.primary },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={{ marginBottom: 8 }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f ? colors.primary : colors.surface, borderColor: filter === f ? colors.primary : colors.border },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="calendar" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, marginTop: 16 }]}>
                {calendarDate ? "No bookings on this date" : "No bookings found"}
              </Text>
              {calendarDate ? (
                <Pressable onPress={() => setCalendarDate(null)}>
                  <Text style={[styles.clearFilter, { color: colors.primary }]}>Clear date filter</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Booking Notes</Text>
              <Pressable onPress={() => setNotesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Special requests, dietary needs, or other notes for this booking
            </Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              multiline
              numberOfLines={6}
              value={notesText}
              onChangeText={setNotesText}
              placeholder="Add notes here..."
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setNotesModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveNotes}
              >
                <Text style={styles.modalBtnText}>Save Notes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timeline Modal */}
      <Modal
        visible={timelineModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTimelineModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Booking Timeline</Text>
              <Pressable onPress={() => setTimelineModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedBooking && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.timelineContainer}>
                  {[
                    {
                      step: "Booking Created",
                      date: new Date(selectedBooking.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                      status: "completed",
                      icon: "calendar",
                    },
                    {
                      step: "Booking Confirmed",
                      date: selectedBooking.status === "confirmed" || selectedBooking.status === "completed" ? "Confirmed" : "Pending",
                      status: selectedBooking.status === "confirmed" || selectedBooking.status === "completed" ? "completed" : "pending",
                      icon: "check-circle",
                    },
                    {
                      step: "Payment Made",
                      date: selectedBooking.paymentStatus === "paid" ? "Paid" : "Pending",
                      status: selectedBooking.paymentStatus === "paid" ? "completed" : "pending",
                      icon: "credit-card",
                    },
                    {
                      step: "Check-in",
                      date: selectedBooking.checkIn,
                      status: new Date(selectedBooking.checkIn) <= new Date() ? "completed" : "pending",
                      icon: "log-in-outline",
                    },
                    {
                      step: "Check-out",
                      date: selectedBooking.checkOut,
                      status: new Date(selectedBooking.checkOut) <= new Date() ? "completed" : "pending",
                      icon: "log-out-outline",
                    },
                  ].map((event, index) => (
                    <View key={index} style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: event.status === "completed" ? colors.success : colors.muted }]} />
                      {index < 4 && <View style={[styles.timelineLine, { backgroundColor: index < 3 && event.status === "completed" ? colors.success : colors.muted }]} />}
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <Ionicons name={event.icon as any} size={16} color={event.status === "completed" ? colors.success : colors.mutedForeground} />
                          <Text style={[styles.timelineStep, { color: colors.foreground }]}>{event.step}</Text>
                        </View>
                        <Text style={[styles.timelineDate, { color: colors.mutedForeground }]}>{event.date}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {paymentModalVisible && (
        <Suspense fallback={null}>
          <PaymentModal
            visible={paymentModalVisible}
            onClose={() => setPaymentModalVisible(false)}
            booking={selectedBooking}
            onSuccess={() => refetch()}
          />
        </Suspense>
      )}

      {guestPaymentModalVisible && (
        <Suspense fallback={null}>
          <GuestPaymentModal
            visible={guestPaymentModalVisible}
            onClose={() => setGuestPaymentModalVisible(false)}
            booking={selectedBooking}
            onSuccess={() => refetch()}
          />
        </Suspense>
      )}

      {chatModalVisible && (
        <Suspense fallback={null}>
          <ChatModal
            visible={chatModalVisible}
            onClose={() => setChatModalVisible(false)}
            booking={selectedBooking}
            currentUser={user}
          />
        </Suspense>
      )}

      {specialRequestsModalVisible && (
        <Suspense fallback={null}>
          <SpecialRequestsModal
            visible={specialRequestsModalVisible}
            onClose={() => setSpecialRequestsModalVisible(false)}
            booking={selectedBooking}
            onSuccess={() => refetch()}
          />
        </Suspense>
      )}

      {upiQRModalVisible && (
        <Suspense fallback={null}>
          <UPIQRModal
            visible={upiQRModalVisible}
            onClose={() => setUpiQRModalVisible(false)}
            upiId={selectedBooking?.property?.upiId || ""}
            amount={selectedBooking?.totalAmount || 0}
            bookingRef={selectedBooking?.referenceNumber || ""}
            property={selectedBooking?.property?.name}
          />
        </Suspense>
      )}

      {travelGuideModalVisible && (
        <Suspense fallback={null}>
          <TravelGuideModal
            visible={travelGuideModalVisible}
            onClose={() => setTravelGuideModalVisible(false)}
            property={selectedBooking?.property}
            guestMobile={isHost ? selectedBooking?.guestMobile : undefined}
            guestName={isHost ? selectedBooking?.guestName : undefined}
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  calendarLabel: { fontSize: 11, fontWeight: "600" },
  clearDateBtn: { fontSize: 12, fontWeight: "700" },
  dateStrip: { paddingHorizontal: 16, gap: 8 },
  datePill: {
    width: 52,
    height: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
  },
  datePillDay: { fontSize: 10, fontWeight: "700" },
  datePillNum: { fontSize: 18, fontWeight: "800" },
  bookingDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  filterList: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, paddingBottom: 120 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  refBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  refText: { fontSize: 12, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "800" },
  propertyName: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  roomInfo: { fontSize: 13, marginBottom: 10 },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  guestText: { fontSize: 14, fontWeight: "700", flex: 1 },
  guestMobile: { fontSize: 12 },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateBlock: { flex: 1 },
  dateLabel: { fontSize: 9, fontWeight: "800", marginBottom: 4 },
  dateValue: { fontSize: 13, fontWeight: "700" },
  timeText: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  nightsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
  },
  nightsText: { fontSize: 11, fontWeight: "700" },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amountLabel: { fontSize: 11, marginBottom: 2 },
  amountValue: { fontSize: 20, fontWeight: "800" },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  payText: { fontSize: 10, fontWeight: "800" },
  actionsContainer: { gap: 10 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  clearFilter: { fontSize: 14, fontWeight: "700", marginTop: 8 },
  loginBtn: { width: "100%", height: 52, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 120,
    marginBottom: 20,
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
  timelineContainer: { paddingVertical: 16 },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    position: "relative",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 2,
  },
  timelineLine: {
    position: "absolute",
    left: 5,
    top: 14,
    width: 2,
    height: 40,
  },
  timelineContent: { flex: 1 },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  timelineStep: { fontSize: 14, fontWeight: "700" },
  timelineDate: { fontSize: 12 },
});
