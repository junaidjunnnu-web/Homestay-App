import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
import { useGetProperties } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

const DESTINATIONS = [
  "Coorg",
  "Ooty",
  "Munnar",
  "Goa",
  "Manali",
  "Wayanad",
  "Rishikesh",
];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useGetProperties({
    city: selectedCity || undefined,
  });

  const properties = data?.properties || [];

  const renderProperty = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        {item.photos && item.photos.length > 0 ? (
          <ExpoImage
            source={{ uri: item.photos[0] }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.image}
          />
        )}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={styles.ratingText}>
            {item.averageRating?.toFixed(1) || "New"}
          </Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.propertyName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.price}>
            ₹{item.minPrice?.toLocaleString("en-IN") || 0}
            <Text style={styles.perNight}>/night</Text>
          </Text>
        </View>
        <Text style={styles.cityText}>{item.city}, {item.state}</Text>
        {item.mealsIncluded && (
          <View style={styles.mealsBadge}>
            <Feather name="coffee" size={12} color={colors.primary} />
            <Text style={styles.mealsText}>Meals included</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            placeholder="Search destinations..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      <View style={styles.destinationsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationsList}>
          <Pressable
            style={[
              styles.chip,
              !selectedCity && { backgroundColor: colors.primary },
              { borderColor: colors.border },
            ]}
            onPress={() => setSelectedCity(null)}
          >
            <Text style={[styles.chipText, !selectedCity && { color: colors.primaryForeground }]}>All</Text>
          </Pressable>
          {DESTINATIONS.map((city) => (
            <Pressable
              key={city}
              style={[
                styles.chip,
                selectedCity === city && { backgroundColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[styles.chipText, selectedCity === city && { color: colors.primaryForeground }]}>
                {city}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="map" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No homestays found here yet</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  destinationsContainer: {
    marginBottom: 8,
  },
  destinationsList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    height: 200,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardInfo: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  perNight: {
    fontSize: 12,
    fontWeight: "400",
  },
  cityText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  mealsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
