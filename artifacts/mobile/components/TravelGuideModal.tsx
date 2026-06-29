import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const CATEGORIES = [
  { key: "all", label: "All", icon: "grid" },
  { key: "restaurant", label: "Restaurants", icon: "coffee", color: "#F59E0B" },
  { key: "tourist_spot", label: "Tourist Spots", icon: "map-pin", color: "#3B82F6" },
  { key: "beach", label: "Beaches", icon: "waves", color: "#06B6D4" },
  { key: "park", label: "Parks", icon: "trees", color: "#10B981" },
  { key: "shopping", label: "Shopping", icon: "shopping-bag", color: "#EC4899" },
  { key: "adventure", label: "Adventure", icon: "compass", color: "#EF4444" },
  { key: "cultural", label: "Cultural", icon: "book", color: "#F97316" },
];

interface TravelGuideModalProps {
  visible: boolean;
  onClose: () => void;
  property: any;
}

export default function TravelGuideModal({ visible, onClose, property }: TravelGuideModalProps) {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: attractions, isLoading } = useQuery({
    queryKey: ["attractions", property?.id, selectedCategory],
    queryFn: async () => {
      const token = await AsyncStorage.getItem("homestay_token");
      const url = selectedCategory === "all"
        ? `${API_BASE}/properties/${property.id}/attractions`
        : `${API_BASE}/properties/${property.id}/attractions?category=${selectedCategory}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch attractions");
      }
      return response.json();
    },
    enabled: !!property?.id,
  });

  const filteredAttractions = selectedCategory === "all"
    ? attractions
    : attractions?.filter((a: any) => a.category === selectedCategory);

  const openMap = (attraction: any) => {
    if (attraction.latitude && attraction.longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${attraction.latitude},${attraction.longitude}`);
    } else if (attraction.address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(attraction.address)}`);
    }
  };

  const callContact = (contact: string) => {
    Linking.openURL(`tel:${contact}`);
  };

  const openWebsite = (url: string) => {
    Linking.openURL(url);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat?.icon || "location";
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat?.color || "#6B7280";
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#E8824A" }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Local Travel Guide</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Property Info */}
        <View style={[styles.propertyInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.propertyName, { color: colors.foreground }]}>{property?.name}</Text>
          <Text style={[styles.propertyLocation, { color: colors.mutedForeground }]}>
            {property?.location}
          </Text>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.key}
              style={[
                styles.categoryChip,
                selectedCategory === category.key
                  ? { backgroundColor: "#E8824A" }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Ionicons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.key ? "#fff" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: selectedCategory === category.key ? "#fff" : colors.foreground },
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Attractions List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#E8824A" style={{ marginTop: 20 }} />
          ) : filteredAttractions && filteredAttractions.length > 0 ? (
            filteredAttractions.map((attraction: any) => (
              <View
                key={attraction.id}
                style={[styles.attractionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Header */}
                <View style={styles.attractionHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(attraction.category) + "20" }]}>
                    <Ionicons
                      name={getCategoryIcon(attraction.category) as any}
                      size={16}
                      color={getCategoryColor(attraction.category)}
                    />
                    <Text style={[styles.categoryBadgeText, { color: getCategoryColor(attraction.category) }]}>
                      {attraction.category.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                  {attraction.rating && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{attraction.rating}</Text>
                    </View>
                  )}
                </View>

                {/* Name & Description */}
                <Text style={[styles.attractionName, { color: colors.foreground }]}>{attraction.name}</Text>
                {attraction.description && (
                  <Text style={[styles.attractionDescription, { color: colors.mutedForeground }]}>
                    {attraction.description}
                  </Text>
                )}

                {/* Details */}
                <View style={styles.detailsRow}>
                  {attraction.distance && (
                    <View style={styles.detailItem}>
                      <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        {attraction.distance} km
                      </Text>
                    </View>
                  )}
                  {attraction.estimatedTime && (
                    <View style={styles.detailItem}>
                      <Feather name="clock" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        {attraction.estimatedTime}
                      </Text>
                    </View>
                  )}
                  {attraction.entryFee && (
                    <View style={styles.detailItem}>
                      <Feather name="dollar-sign" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        {attraction.entryFee}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Opening Hours */}
                {attraction.openingHours && (
                  <View style={styles.hoursRow}>
                    <Feather name="clock" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.hoursText, { color: colors.mutedForeground }]}>
                      {attraction.openingHours}
                    </Text>
                  </View>
                )}

                {/* Host Tips */}
                {attraction.tips && (
                  <View style={[styles.tipsBox, { backgroundColor: colors.background }]}>
                    <Ionicons name="bulb" size={14} color="#F59E0B" />
                    <Text style={[styles.tipsText, { color: colors.foreground }]}>{attraction.tips}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <Pressable style={[styles.actionButton, { backgroundColor: "#3B82F6" }]} onPress={() => openMap(attraction)}>
                    <Ionicons name="map" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Map</Text>
                  </Pressable>
                  {attraction.contact && (
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: "#10B981" }]}
                      onPress={() => callContact(attraction.contact)}
                    >
                      <Ionicons name="call" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Call</Text>
                    </Pressable>
                  )}
                  {attraction.website && (
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: "#8B5CF6" }]}
                      onPress={() => openWebsite(attraction.website)}
                    >
                      <Ionicons name="globe" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Website</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="map" size={64} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No attractions found in this category
              </Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "center" },
  propertyInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  propertyName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  propertyLocation: { fontSize: 13 },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  content: { flex: 1, padding: 16 },
  attractionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  attractionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: "700" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F59E0B20",
  },
  ratingText: { fontSize: 12, fontWeight: "700" },
  attractionName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  attractionDescription: { fontSize: 14, marginBottom: 12 },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: { fontSize: 12 },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  hoursText: { fontSize: 12 },
  tipsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  tipsText: { fontSize: 13, flex: 1 },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: { fontSize: 14, marginTop: 16, textAlign: "center" },
});
