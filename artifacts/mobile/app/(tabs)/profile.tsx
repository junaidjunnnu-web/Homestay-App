import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [idProofModalVisible, setIdProofModalVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [idProofImage, setIdProofImage] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(1250);
  const [wishlist, setWishlist] = useState<any[]>([]);

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant camera roll permissions to upload photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const pickIdProof = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant camera roll permissions to upload ID proof.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setIdProofImage(result.assets[0].uri);
    }
  };

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
    { label: "My Wishlist", icon: "heart", action: () => setEditModalVisible(true), badge: wishlist.length },
    { label: "Loyalty Points", icon: "award", action: () => {}, badge: loyaltyPoints },
    { label: "ID Proof", icon: "credit-card", action: () => setIdProofModalVisible(true) },
    { label: "Account Settings", icon: "settings", action: () => setEditModalVisible(true) },
    { label: "Support", icon: "help-circle", action: () => {} },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.profileHeader}>
        <Pressable onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{user.role.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Loyalty Points Card */}
      <View style={[styles.loyaltyCard, { backgroundColor: colors.primary }]}>
        <View style={styles.loyaltyLeft}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <View>
            <Text style={styles.loyaltyTitle}>Loyalty Points</Text>
            <Text style={styles.loyaltySubtitle}>Earn points with every booking</Text>
          </View>
        </View>
        <View style={styles.loyaltyRight}>
          <Text style={styles.loyaltyPoints}>{loyaltyPoints.toLocaleString()}</Text>
          <Text style={styles.loyaltyLabel}>PTS</Text>
        </View>
      </View>

      <ScrollView style={styles.menu}>
        {menuItems.map((item, index) => (
          <Pressable key={index} style={[styles.menuItem, { borderColor: colors.border }]} onPress={item.action}>
            <View style={styles.menuItemLeft}>
              <Feather name={item.icon as any} size={20} color={colors.primary} />
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge && (
                <View style={[styles.menuBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.menuBadgeText, { color: colors.primary }]}>{item.badge}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </View>
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

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                defaultValue={user.name}
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                defaultValue={user.email}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
              />
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                defaultValue={user.mobile}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
              <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ID Proof Modal */}
      <Modal visible={idProofModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ID Proof</Text>
              <Pressable onPress={() => setIdProofModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Upload your government ID (Aadhaar, PAN, Passport) for verification. This helps ensure safe and secure bookings.
              </Text>
              {idProofImage ? (
                <Image source={{ uri: idProofImage }} style={styles.idProofImage} />
              ) : (
                <Pressable style={[styles.uploadPlaceholder, { borderColor: colors.border }]} onPress={pickIdProof}>
                  <Ionicons name="cloud-upload-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>Tap to upload ID proof</Text>
                </Pressable>
              )}
              {idProofImage && (
                <Pressable style={[styles.changeBtn, { borderColor: colors.primary }]} onPress={pickIdProof}>
                  <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change ID Proof</Text>
                </Pressable>
              )}
              <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>Submit for Verification</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
  loyaltyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  loyaltyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  loyaltySubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  loyaltyRight: {
    alignItems: "flex-end",
  },
  loyaltyPoints: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFD700",
  },
  loyaltyLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
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
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: "700",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#8A7A6E",
    marginBottom: 16,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7A6E",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  idProofImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 14,
    marginTop: 12,
  },
  changeBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 16,
  },
  changeBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
