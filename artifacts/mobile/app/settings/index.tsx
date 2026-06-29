import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetHostProperties, useUpdateProperty } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<"description" | "policies" | "payment">("description");

  const { data: properties, isLoading, refetch, isRefetching } = useGetHostProperties({
    query: { enabled: !!user && user.role === "host" } as any
  });

  const { mutate: updateProperty, isPending: isUpdating } = useUpdateProperty();

  const [formData, setFormData] = useState({
    description: "",
    policies: "",
    paymentDetails: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });

  const openModal = (property: any, section: "description" | "policies" | "payment") => {
    setSelectedProperty(property);
    setActiveSection(section);
    setFormData({
      description: property.description || "",
      policies: property.policies || "",
      paymentDetails: property.paymentDetails || "",
      bankName: property.bankName || "",
      accountNumber: property.accountNumber || "",
      ifscCode: property.ifscCode || "",
      upiId: property.upiId || "",
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!selectedProperty) return;
    
    updateProperty(
      { propertyId: selectedProperty.id, data: formData as any },
      {
        onSuccess: () => {
          Alert.alert("Success", "Settings updated successfully");
          setModalVisible(false);
          refetch();
        },
      }
    );
  };

  if (!user || user.role !== "host") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.primary }]}>
        <Left onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Left>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          properties?.map((property: any) => (
            <View key={property.id} style={styles.propertySection}>
              <Text style={styles.propertyName}>{property.name}</Text>
              
              <Pressable
                style={[styles.settingItem, { backgroundColor: colors.surface }]}
                onPress={() => openModal(property, "description")}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="file-text" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>Property Description</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {property.description || "Not set"}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                style={[styles.settingItem, { backgroundColor: colors.surface }]}
                onPress={() => openModal(property, "policies")}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: "#10B981" + "15" }]}>
                    <Feather name="shield" size={20} color="#10B981" />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>House Policies</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {property.policies || "Not set"}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                style={[styles.settingItem, { backgroundColor: colors.surface }]}
                onPress={() => openModal(property, "payment")}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: "#3B82F6" + "15" }]}>
                    <Feather name="credit-card" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>Payment Details</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {property.upiId || property.bankName || "Not set"}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeSection === "description" ? "Property Description" : 
                 activeSection === "policies" ? "House Policies" : "Payment Details"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeSection === "description" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Describe your property, amenities, location..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                </View>
              )}

              {activeSection === "policies" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>House Policies</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
                    value={formData.policies}
                    onChangeText={(text) => setFormData({ ...formData, policies: text })}
                    placeholder="Check-in/out times, smoking policy, pets, etc."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                </View>
              )}

              {activeSection === "payment" && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>UPI ID</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                      value={formData.upiId}
                      onChangeText={(text) => setFormData({ ...formData, upiId: text })}
                      placeholder="e.g. yourname@upi"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Bank Name</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                      value={formData.bankName}
                      onChangeText={(text) => setFormData({ ...formData, bankName: text })}
                      placeholder="e.g. HDFC Bank"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Account Number</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                      value={formData.accountNumber}
                      onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                      placeholder="Your bank account number"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>IFSC Code</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                      value={formData.ifscCode}
                      onChangeText={(text) => setFormData({ ...formData, ifscCode: text.toUpperCase() })}
                      placeholder="e.g. HDFC0001234"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="characters"
                    />
                  </View>
                </>
              )}

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }, isUpdating && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Left = ({ children, onPress }: any) => <Pressable onPress={onPress}>{children}</Pressable>;

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
  propertySection: { marginBottom: 24 },
  propertyName: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  settingSubtitle: { fontSize: 12, color: "#8A7A6E" },
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
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7A6E",
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 150,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
