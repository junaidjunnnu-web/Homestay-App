import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, subtitle, onPress, color, iconType = "feather", badge }: any) => (
    <Pressable
      style={[styles.menuItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color + "15" }]}>
        {iconType === "feather" ? (
          <Feather name={icon} size={22} color={color} />
        ) : (
          <Ionicons name={icon} size={22} color={color} />
        )}
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>More</Text>
            <Text style={styles.headerSub}>Tools & Settings</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name?.charAt(0).toUpperCase() || "H"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <MenuItem
            icon="bell"
            title="Notifications"
            subtitle="Bookings, reminders & alerts"
            color="#F59E0B"
            iconType="feather"
            badge="3"
            onPress={() => router.push("/notifications")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BOOKINGS</Text>
          <MenuItem
            icon="plus-square"
            title="Add Booking"
            subtitle="Walk-in, phone or WhatsApp inquiry"
            color="#3B82F6"
            iconType="feather"
            onPress={() => router.push("/booking/add")}
          />
          <MenuItem
            icon="users"
            title="Guest Register"
            subtitle="View & manage all guests"
            color="#10B981"
            iconType="feather"
            onPress={() => router.push("/guest-register")}
          />
          <MenuItem
            icon="calendar"
            title="All Bookings"
            subtitle="View & update booking status"
            color={colors.primary}
            iconType="feather"
            onPress={() => router.push("/(tabs)/bookings")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OPERATIONS</Text>
          <MenuItem
            icon="check-square"
            title="Housekeeping"
            subtitle="Daily cleaning & room tasks"
            color="#8B5CF6"
            iconType="feather"
            onPress={() => router.push("/housekeeping")}
          />
          <MenuItem
            icon="coffee"
            title="Menu Management"
            subtitle="Food & beverages for guests"
            color="#E8824A"
            iconType="feather"
            onPress={() => router.push("/menu")}
          />
          <MenuItem
            icon="bar-chart-2"
            title="Finance"
            subtitle="Revenue & payment reports"
            color="#27AE60"
            iconType="feather"
            onPress={() => router.push("/(tabs)/finance")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEAM</Text>
          <MenuItem
            icon="user-plus"
            title="Staff"
            subtitle="Manage your team members"
            color="#EC4899"
            iconType="feather"
            onPress={() => router.push("/staff")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROPERTIES</Text>
          <MenuItem
            icon="home"
            title="My Properties"
            subtitle="Manage properties & rooms"
            color="#6366F1"
            iconType="feather"
            onPress={() => router.push("/(tabs)/properties")}
          />
          <MenuItem
            icon="plus-circle"
            title="Add New Property"
            subtitle="List a new homestay"
            color={colors.primary}
            iconType="feather"
            onPress={() => router.push("/property/add")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <MenuItem
            icon="settings"
            title="Settings"
            subtitle="Property description, policies & payments"
            color="#6366F1"
            iconType="feather"
            onPress={() => router.push("/settings")}
          />
          <MenuItem
            icon="credit-card"
            title="Payment Settings"
            subtitle="Payment methods, UPI, bank details"
            color="#E8824A"
            iconType="feather"
            onPress={() => router.push("/settings/payment")}
          />
          <MenuItem
            icon="list"
            title="Transaction History"
            subtitle="View all payment transactions"
            color="#8B5CF6"
            iconType="feather"
            onPress={() => router.push("/transactions")}
          />
        </View>

        <View style={styles.section}>
          <Pressable
            style={[styles.logoutBtn, { borderColor: colors.destructive }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={20} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>Logout</Text>
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800" },
  scrollContent: { paddingTop: 20 },
  section: { marginTop: 20, paddingHorizontal: 15 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: { flex: 1, marginLeft: 15 },
  menuTitle: { fontSize: 15, fontWeight: "700" },
  menuSubtitle: { fontSize: 12, color: "#8A7A6E", marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: { fontSize: 16, fontWeight: "700" },
});
