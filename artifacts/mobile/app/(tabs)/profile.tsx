import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.guestContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="person-outline" size={60} color={colors.primary} />
          </View>
          <Text style={styles.guestTitle}>Welcome to Homestay</Text>
          <Text style={styles.guestSub}>Log in to manage your bookings and discover beautiful homes across India.</Text>
          
          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginBtnText}>Log In / Register</Text>
          </Pressable>

          <Pressable
            style={styles.trackBtn}
            onPress={() => router.push("/booking/track")}
          >
            <Text style={[styles.trackBtnText, { color: colors.primary }]}>Track Existing Booking</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const menuItems = [
    { label: "My Bookings", icon: "calendar", action: () => router.push("/(tabs)/bookings") },
    { label: "Track a Booking", icon: "search", action: () => router.push("/booking/track") },
    { label: "Account Settings", icon: "settings", action: () => {} },
    { label: "Support", icon: "help-circle", action: () => {} },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{user.role.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.menu}>
        {menuItems.map((item, index) => (
          <Pressable key={index} style={[styles.menuItem, { borderColor: colors.border }]} onPress={item.action}>
            <View style={styles.menuItemLeft}>
              <Feather name={item.icon as any} size={20} color={colors.primary} />
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>
        ))}

        <Pressable
          style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          onPress={logout}
        >
          <Feather name="log-out" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Logout</Text>
        </Pressable>
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
  guestContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  guestSub: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  loginBtn: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  trackBtn: {
    padding: 12,
  },
  trackBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  profileHeader: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
    gap: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
  },
  menu: {
    flex: 1,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 40,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
