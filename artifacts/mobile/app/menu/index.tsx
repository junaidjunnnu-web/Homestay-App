import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMenuItems, useCreateMenuItem, useDeleteMenuItem, useUpdateMenuItem, useGetHostProperties } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Snacks", "Beverages"];

export default function MenuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const { data: properties } = useGetHostProperties({ 
    query: { enabled: !!user && user.role === "host" } as any 
  });
  const propertyId = properties?.[0]?.id || "";

  const { data: menuItems, isLoading, refetch, isRefetching } = useGetMenuItems(
    { propertyId },
    { query: { enabled: !!propertyId } as any }
  );

  const { mutate: createItem, isPending: isCreating } = useCreateMenuItem();
  const { mutate: deleteItem } = useDeleteMenuItem();
  const { mutate: updateItem } = useUpdateMenuItem();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Breakfast",
    isVeg: true,
    isAvailable: true,
  });

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    if (selectedCategory === "All") return menuItems;
    return menuItems.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const handleAddItem = () => {
    if (!form.name || !form.price) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    createItem({ data: { ...form, price: parseFloat(form.price), propertyId } as any }, {
      onSuccess: () => {
        setIsModalVisible(false);
        setForm({ name: "", description: "", price: "", category: "Breakfast", isVeg: true, isAvailable: true });
        refetch();
      }
    });
  };

  const handleToggleAvailable = (id: string, current: boolean) => {
    updateItem({ menuItemId: id, data: { isAvailable: !current } }, {
      onSuccess: () => refetch()
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteItem({ menuItemId: id }, { onSuccess: () => refetch() }) }
    ]);
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
          <Text style={styles.headerTitle}>Menu Management</Text>
          <Pressable style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <Pressable 
              key={cat} 
              style={[
                styles.categoryChip, 
                selectedCategory === cat && { backgroundColor: colors.primary }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && { color: "#fff" }]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="coffee" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No items found in this category</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: colors.surface }]}>
            <View style={styles.itemMain}>
              <View style={styles.itemInfo}>
                <View style={styles.itemNameRow}>
                  <View style={[styles.vegDot, { backgroundColor: item.isVeg ? "#27AE60" : "#E53E3E" }]} />
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
              <View style={styles.itemActions}>
                <Switch 
                  value={item.isAvailable} 
                  onValueChange={() => handleToggleAvailable(item.id, item.isAvailable)}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                />
                <Pressable onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Menu Item</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name</Text>
                <TextInput 
                  style={[styles.input, { borderColor: colors.border }]} 
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  placeholder="e.g. Masala Dosa"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput 
                  style={[styles.input, styles.textArea, { borderColor: colors.border }]} 
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                  placeholder="Ingredients, preparation, etc."
                  multiline
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput 
                    style={[styles.input, { borderColor: colors.border }]} 
                    value={form.price}
                    onChangeText={(text) => setForm({ ...form, price: text })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 15 }} />
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Veg / Non-Veg</Text>
                  <View style={styles.vegToggle}>
                    <Pressable 
                      style={[styles.vegBtn, form.isVeg && { backgroundColor: "#27AE60" }]} 
                      onPress={() => setForm({ ...form, isVeg: true })}
                    >
                      <Text style={[styles.vegBtnText, form.isVeg && { color: "#fff" }]}>Veg</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.vegBtn, !form.isVeg && { backgroundColor: "#E53E3E" }]} 
                      onPress={() => setForm({ ...form, isVeg: false })}
                    >
                      <Text style={[styles.vegBtnText, !form.isVeg && { color: "#fff" }]}>Non-Veg</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryPicker}>
                  {CATEGORIES.filter(c => c !== "All").map((cat) => (
                    <Pressable 
                      key={cat}
                      style={[
                        styles.catOption, 
                        { borderColor: colors.border },
                        form.category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setForm({ ...form, category: cat })}
                    >
                      <Text style={[styles.catOptionText, form.category === cat && { color: "#fff" }]}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable 
                style={[styles.submitBtn, { backgroundColor: colors.primary }, isCreating && { opacity: 0.7 }]}
                onPress={handleAddItem}
                disabled={isCreating}
              >
                {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add to Menu</Text>}
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
  categoryContainer: {
    paddingVertical: 15,
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8A7A6E",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  itemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  itemMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemDesc: {
    fontSize: 12,
    color: "#8A7A6E",
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
  },
  itemActions: {
    alignItems: "flex-end",
    gap: 15,
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
    maxHeight: "85%",
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
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  vegToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    overflow: "hidden",
    height: 50,
  },
  vegBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  vegBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A6E",
  },
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
