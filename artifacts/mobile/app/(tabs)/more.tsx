import {
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

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();

  const MenuItem = ({ icon, title, subtitle, route, color, iconType = "feather" }: any) => (
    <Pressable 
      style={[styles.menuItem, { backgroundColor: colors.surface }]}
      onPress={() => route && router.push(route)}
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
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSub}>Tools & Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BOOKINGS</Text>
          <MenuItem 
            icon="plus-square" 
            title="Add Booking" 
            subtitle="Walk-in, phone or WhatsApp" 
            color="#3B82F6" 
          />
          <MenuItem 
            icon="users" 
            title="Guest Register" 
            subtitle="View & manage guests" 
            color="#10B981" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OPERATIONS</Text>
          <MenuItem 
            icon="check-square" 
            title="Housekeeping" 
            subtitle="Daily cleaning tasks" 
            color="#8B5CF6" 
            route="/housekeeping"
          />
          <MenuItem 
            icon="tool" 
            title="Maintenance" 
            subtitle="Property repairs & upkeep" 
            color="#F59E0B" 
            route="/housekeeping"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEAM</Text>
          <MenuItem 
            icon="user-plus" 
            title="Staff" 
            subtitle="Manage your team" 
            color="#EC4899" 
            route="/staff"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GUEST EXPERIENCE</Text>
          <MenuItem 
            icon="coffee" 
            title="Menu Management" 
            subtitle="Food & beverages" 
            color="#E8824A" 
            route="/menu"
          />
        </View>

        <View style={styles.section}>
          <Pressable 
            style={[styles.logoutBtn, { borderColor: colors.destructive }]}
            onPress={logout}
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
  container: {
    flex: 1,
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
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8A7A6E",
    letterSpacing: 1,
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
  menuTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#8A7A6E",
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
