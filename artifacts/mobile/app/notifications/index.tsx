import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    type: "booking",
    title: "New Booking Received",
    message: "John Doe has booked Room 101 for 3 nights",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    type: "payment",
    title: "Payment Due",
    message: "₹15,000 payment due for booking #1234",
    time: "5 hours ago",
    read: false,
  },
  {
    id: "3",
    type: "reminder",
    title: "Check-in Reminder",
    message: "Guest check-in at 2:00 PM today",
    time: "1 day ago",
    read: true,
  },
  {
    id: "4",
    type: "review",
    title: "New Review",
    message: "Jane Smith left a 5-star review",
    time: "2 days ago",
    read: true,
  },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking": return "calendar";
      case "payment": return "credit-card";
      case "reminder": return "bell";
      case "review": return "star";
      default: return "bell";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "booking": return "#3B82F6";
      case "payment": return "#EF4444";
      case "reminder": return "#F59E0B";
      case "review": return "#10B981";
      default: return colors.primary;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const clearAllRead = () => {
    setNotifications(notifications.filter(n => !n.read));
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const renderNotification = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.notificationCard, { backgroundColor: colors.surface, borderLeftWidth: item.read ? 0 : 4, borderLeftColor: getNotificationColor(item.type) }]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + "15" }]}>
        <Feather name={getNotificationIcon(item.type) as any} size={20} color={getNotificationColor(item.type)} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[styles.notificationMessage, { color: colors.mutedForeground }]}>{item.message}</Text>
        <Text style={[styles.notificationTime, { color: colors.mutedForeground }]}>{item.time}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable style={styles.clearButton} onPress={clearAllRead}>
          <Text style={styles.clearButtonText}>Clear Read</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  clearButton: { padding: 8 },
  clearButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  list: { padding: 20, paddingBottom: 100 },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: { fontSize: 15, fontWeight: "700" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notificationMessage: { fontSize: 13, marginBottom: 4 },
  notificationTime: { fontSize: 11 },
  empty: { alignItems: "center", marginTop: 100, gap: 16 },
  emptyText: { fontSize: 16, color: "#8A7A6E" },
});
