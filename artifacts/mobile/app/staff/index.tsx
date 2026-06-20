import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Linking,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetStaff, useCreateStaffMember, useDeleteStaffMember } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function StaffScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    role: "caretaker",
  });

  const { data: staff, isLoading, refetch, isRefetching } = useGetStaff({}, { 
    query: { enabled: !!user && user.role === "host" } as any 
  });

  const { mutate: createStaff, isPending: isCreating } = useCreateStaffMember();
  const { mutate: deleteStaff } = useDeleteStaffMember();

  const handleAddStaff = () => {
    if (!form.name || !form.mobile) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    createStaff({ data: { ...form, propertyId: "" } as any }, {
      onSuccess: () => {
        setIsModalVisible(false);
        setForm({ name: "", mobile: "", role: "caretaker" });
        refetch();
      }
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Staff", "Are you sure you want to remove this staff member?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteStaff({ staffId: id }, { onSuccess: () => refetch() }) }
    ]);
  };

  const openWhatsApp = (mobile: string, name: string) => {
    const url = `https://wa.me/91${mobile}?text=${encodeURIComponent(`Hi ${name}, regarding the homestay...`)}`;
    Linking.openURL(url);
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
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Staff Management</Text>
          <Pressable style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="users" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No staff members added yet</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.staffCard, { backgroundColor: colors.surface }]}>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{item.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>{item.role.toUpperCase()}</Text>
              </View>
              <Text style={styles.staffMobile}>{item.mobile}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={[styles.actionBtn, { backgroundColor: "#25D366" }]} onPress={() => openWhatsApp(item.mobile || "", item.name)}>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.destructive + "15" }]} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff Member</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border }]} 
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                placeholder="e.g. Rahul Kumar"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border }]} 
                value={form.mobile}
                onChangeText={(text) => setForm({ ...form, mobile: text })}
                placeholder="10 digit mobile number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.rolePicker}>
                {["caretaker", "cleaner", "cook", "manager"].map((role) => (
                  <Pressable 
                    key={role}
                    style={[
                      styles.roleOption, 
                      { borderColor: colors.border },
                      form.role === role && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setForm({ ...form, role })}
                  >
                    <Text style={[styles.roleOptionText, form.role === role && { color: "#fff" }]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable 
              style={[styles.submitBtn, { backgroundColor: colors.primary }, isCreating && { opacity: 0.7 }]}
              onPress={handleAddStaff}
              disabled={isCreating}
            >
              {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Staff Member</Text>}
            </Pressable>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  staffCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
  },
  staffMobile: {
    fontSize: 13,
    color: "#8A7A6E",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    marginTop: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#8A7A6E",
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7A6E",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  rolePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
