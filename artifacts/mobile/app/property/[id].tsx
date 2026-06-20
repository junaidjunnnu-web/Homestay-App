import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProperty, useGetPropertyReviews } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: property, isLoading } = useGetProperty(id!);
  const { data: reviews } = useGetPropertyReviews(id!);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text>Property not found</Text>
      </View>
    );
  }

  const openMaps = () => {
    const query = encodeURIComponent(`${property.name}, ${property.city}, ${property.state}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url);
  };

  const openWhatsApp = () => {
    const url = `https://wa.me/91${property.host?.mobile}?text=${encodeURIComponent(`Hi, I'm interested in booking ${property.name}`)}`;
    Linking.openURL(url);
  };

  const openCall = () => {
    Linking.openURL(`tel:+91${property.host?.mobile}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageGallery}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {property.photos && property.photos.length > 0 ? (
              property.photos.map((photo, index) => (
                <ExpoImage key={index} source={{ uri: photo }} style={styles.galleryImage} />
              ))
            ) : (
              <LinearGradient colors={[colors.primary, colors.accent]} style={styles.galleryImage} />
            )}
          </ScrollView>
          <Pressable style={[styles.backButton, { top: insets.top + 12 }]} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.name}>{property.name}</Text>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={styles.location}>{property.city}, {property.state}</Text>
              </View>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={16} color={colors.star} />
              <Text style={styles.ratingText}>{property.averageRating?.toFixed(1) || "New"}</Text>
              <Text style={styles.reviewCount}>({property.reviewCount || 0})</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.actionBtn, { backgroundColor: "#25D366" }]} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.primary }]} onPress={openCall}>
              <Feather name="phone" size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Call Owner</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { borderWidth: 1, borderColor: "#3B82F6" }]} onPress={openMaps}>
              <Feather name="map" size={18} color="#3B82F6" />
              <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>Directions</Text>
            </Pressable>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.modeBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.modeBadgeText, { color: colors.primary }]}>
                {property.bookingMode === "instant" ? "Instant Booking" : "Inquiry Booking"}
              </Text>
            </View>
            {property.mealsIncluded && (
              <View style={[styles.modeBadge, { backgroundColor: "#27AE6015" }]}>
                <Ionicons name="restaurant-outline" size={12} color="#27AE60" />
                <Text style={[styles.modeBadgeText, { color: "#27AE60" }]}>Meals Included</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this place</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>

          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {property.amenities.map((amenity) => (
                  <View key={amenity} style={[styles.amenityChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Rooms</Text>
            {property.rooms && property.rooms.length > 0 ? (
              property.rooms.map((room) => (
                <View key={room.id} style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomType}>{room.type} • Up to {room.capacity} guests</Text>
                    <Text style={styles.roomPrice}>₹{room.pricePerNight.toLocaleString("en-IN")} <Text style={styles.perNight}>/night</Text></Text>
                  </View>
                  <Pressable
                    style={[styles.bookButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/booking/${room.id}`)}
                  >
                    <Text style={styles.bookButtonText}>Book</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No rooms listed yet</Text>
            )}
          </View>

          {reviews && reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.guestName || "Anonymous"}</Text>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name="star" size={12} color={s <= review.rating ? colors.star : colors.muted} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
              ))}
            </View>
          )}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageGallery: {
    height: 300,
    width: "100%",
  },
  galleryImage: {
    width: 400,
    height: "100%",
  },
  backButton: {
    position: "absolute",
    left: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 8,
    borderRadius: 20,
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    backgroundColor: "#FAF6F1",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: "#8A7A6E",
  },
  ratingBox: {
    alignItems: "flex-end",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "700",
  },
  reviewCount: {
    fontSize: 12,
    color: "#8A7A6E",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444",
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 13,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  roomType: {
    fontSize: 12,
    color: "#8A7A6E",
    marginBottom: 6,
  },
  roomPrice: {
    fontSize: 16,
    fontWeight: "800",
  },
  perNight: {
    fontSize: 12,
    fontWeight: "400",
  },
  bookButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  reviewCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE4DC",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reviewerName: {
    fontWeight: "700",
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 11,
    color: "#8A7A6E",
  },
  emptyText: {
    color: "#8A7A6E",
    fontStyle: "italic",
  },
});
