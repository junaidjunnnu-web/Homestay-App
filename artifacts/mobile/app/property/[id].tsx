import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProperty, useGetPropertyReviews, useGetMenuItems, useGetProperties, getFullImageUrl } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

const MENU_CATS = ["All", "Breakfast", "Lunch", "Dinner", "Snacks", "Beverages"];

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isHost = user?.role === "host";

  const [menuCat, setMenuCat] = useState("All");

  const { data: property, isLoading } = useGetProperty(id!);
  const { data: reviews } = useGetPropertyReviews(id!);
  const { data: menuItems } = useGetMenuItems(
    { propertyId: id! },
    { query: { enabled: !!id } as any }
  );
  const { data: allProperties } = useGetProperties({ city: property?.city });

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
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const contactPhone = (property as any).phone || property.host?.mobile;

  const openWhatsApp = () => {
    if (!contactPhone) { return; }
    const url = `https://wa.me/91${contactPhone}?text=${encodeURIComponent(`Hi! I found your property "${property.name}" on Homestay App and I'm interested in booking. Could you please share availability and rates?`)}`;
    Linking.openURL(url);
  };

  const openCall = () => {
    if (!contactPhone) { return; }
    Linking.openURL(`tel:+91${contactPhone}`);
  };

  const filteredMenu = menuItems
    ? menuItems.filter(
        (item) =>
          item.isAvailable &&
          (menuCat === "All" || item.category === menuCat)
      )
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {property.photos && property.photos.length > 0 ? (
              property.photos.map((photo, index) => (
                <ExpoImage key={index} source={{ uri: getFullImageUrl(photo) }} style={styles.galleryImage} contentFit="cover" />
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
          {/* Title + Rating */}
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

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Pressable style={[styles.actionBtn, { backgroundColor: "#25D366" }]} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.actionBtnWhite}>WhatsApp</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.primary }]} onPress={openCall}>
              <Feather name="phone" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Call</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { borderWidth: 1, borderColor: "#3B82F6" }]} onPress={openMaps}>
              <Feather name="map" size={16} color="#3B82F6" />
              <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>Map</Text>
            </Pressable>
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.modeBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.modeBadgeText, { color: colors.primary }]}>
                {property.bookingMode === "instant" ? "⚡ Instant Booking" : "📋 Inquiry Booking"}
              </Text>
            </View>
            {property.mealsIncluded && (
              <View style={[styles.modeBadge, { backgroundColor: "#27AE6015" }]}>
                <Ionicons name="restaurant-outline" size={12} color="#27AE60" />
                <Text style={[styles.modeBadgeText, { color: "#27AE60" }]}>Meals Included</Text>
              </View>
            )}
          </View>

          {/* Host Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Host</Text>
            <View style={[styles.hostCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.hostAvatar}>
                <Text style={[styles.hostAvatarText, { color: colors.primary }]}>
                  {property.host?.name?.charAt(0).toUpperCase() || "H"}
                </Text>
              </View>
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{property.host?.name || "Property Host"}</Text>
                <Text style={[styles.hostSince, { color: colors.mutedForeground }]}>
                  Hosting since {new Date(property.host?.createdAt || Date.now()).getFullYear()}
                </Text>
                <View style={styles.hostStats}>
                  <View style={styles.hostStat}>
                    <Text style={styles.hostStatValue}>{property.reviewCount || 0}</Text>
                    <Text style={styles.hostStatLabel}>Reviews</Text>
                  </View>
                  <View style={[styles.hostStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.hostStat}>
                    <Text style={styles.hostStatValue}>{property.averageRating?.toFixed(1) || "N/A"}</Text>
                    <Text style={styles.hostStatLabel}>Rating</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Similar Properties */}
          {allProperties && allProperties.properties && allProperties.properties.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Similar Properties in {property.city}</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={allProperties.properties.filter((p: any) => p.id !== property.id).slice(0, 5)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <Pressable
                    style={[styles.similarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push(`/property/${item.id}`)}
                  >
                    {item.photos && item.photos.length > 0 ? (
                      <ExpoImage
                        source={{ uri: getFullImageUrl(item.photos[0]) }}
                        style={styles.similarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <LinearGradient colors={[colors.primary, colors.accent]} style={styles.similarImage} />
                    )}
                    <Text style={styles.similarName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.similarPrice, { color: colors.primary }]}>
                      ₹{item.minPrice?.toLocaleString("en-IN") || 0}
                      <Text style={styles.similarPerNight}>/night</Text>
                    </Text>
                  </Pressable>
                )}
                contentContainerStyle={styles.similarList}
              />
            </View>
          )}

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this place</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>

          {/* Amenities */}
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

          {/* Rooms */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isHost ? "Rooms" : "Available Rooms"}
              </Text>
              {isHost && (
                <Pressable
                  style={[styles.sectionAddBtn, { backgroundColor: colors.primary }]}
                  onPress={() =>
                    router.push(
                      `/room?propertyId=${property.id}&propertyName=${encodeURIComponent(property.name)}`
                    )
                  }
                >
                  <Feather name="settings" size={13} color="#fff" />
                  <Text style={styles.sectionAddBtnText}>Manage</Text>
                </Pressable>
              )}
            </View>

            {property.rooms && property.rooms.length > 0 ? (
              property.rooms.map((room) => (
                <View key={room.id} style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomType}>{room.type} · Up to {room.capacity} guests</Text>
                    <Text style={styles.roomPrice}>
                      ₹{room.pricePerNight.toLocaleString("en-IN")}
                      <Text style={styles.perNight}> /night</Text>
                    </Text>
                  </View>
                  {isHost ? (
                    <Pressable
                      style={[styles.editRoomBtn, { borderColor: colors.primary }]}
                      onPress={() =>
                        router.push(`/room/add?propertyId=${property.id}&roomId=${room.id}`)
                      }
                    >
                      <Feather name="edit-2" size={14} color={colors.primary} />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.bookButton, { backgroundColor: colors.primary }]}
                      onPress={() => router.push(`/booking/${room.id}`)}
                    >
                      <Text style={styles.bookButtonText}>Book</Text>
                    </Pressable>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                {isHost ? "No rooms added yet. Tap Manage to add rooms." : "No rooms listed yet."}
              </Text>
            )}
          </View>

          {/* Menu Section */}
          {menuItems && menuItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Menu</Text>
              {/* Category filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catList}
              >
                {MENU_CATS.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.catChip,
                      { borderColor: colors.border },
                      menuCat === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setMenuCat(cat)}
                  >
                    <Text style={[styles.catText, menuCat === cat && { color: "#fff" }]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {filteredMenu.length === 0 ? (
                <Text style={styles.emptyText}>No items in this category.</Text>
              ) : (
                filteredMenu.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.menuLeft}>
                      <View style={[styles.vegDot, { backgroundColor: item.isVeg ? "#27AE60" : "#E53E3E" }]} />
                      <View style={styles.menuInfo}>
                        <Text style={styles.menuName}>{item.name}</Text>
                        {!!item.description && (
                          <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
                        )}
                        <Text style={styles.menuCategory}>{item.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.menuPrice}>₹{item.price}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Reviews */}
          {reviews && reviews.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <Pressable onPress={() => {}}>
                  <Text style={[styles.writeReviewBtn, { color: colors.primary }]}>Write Review</Text>
                </Pressable>
              </View>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={[styles.reviewerAvatar, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.reviewerAvatarText, { color: colors.primary }]}>
                          {review.guestName?.charAt(0).toUpperCase() || "G"}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{review.guestName || "Anonymous"}</Text>
                        <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                          {new Date(review.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name="star"
                          size={14}
                          color={s <= review.rating ? colors.star : colors.muted}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  
                  {/* Review Photos */}
                  {(review as any)?.photos && (review as any).photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotosScroll}>
                      {(review as any).photos.map((photo: string, idx: number) => (
                        <ExpoImage
                          key={idx}
                          source={{ uri: getFullImageUrl(photo) }}
                          style={styles.reviewPhoto}
                          contentFit="cover"
                        />
                      ))}
                    </ScrollView>
                  )}

                  {/* Host Reply */}
                  {(review as any)?.hostReply && (
                    <View style={[styles.hostReplyCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.hostReplyLabel, { color: colors.primary }]}>Host Reply</Text>
                      <Text style={styles.hostReplyText}>{(review as any).hostReply}</Text>
                    </View>
                  )}

                  {/* Helpful Actions */}
                  <View style={styles.reviewActions}>
                    <Pressable style={styles.helpfulBtn}>
                      <Feather name="thumbs-up" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.helpfulText, { color: colors.mutedForeground }]}>
                        Helpful ({(review as any)?.helpfulCount || 0})
                      </Text>
                    </Pressable>
                    <Pressable style={styles.helpfulBtn}>
                      <Feather name="flag" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.helpfulText, { color: colors.mutedForeground }]}>Report</Text>
                    </Pressable>
                  </View>
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
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageGallery: { height: 300, width: "100%" },
  galleryImage: { width: 400, height: "100%" },
  backButton: {
    position: "absolute",
    left: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
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
  titleSection: { flex: 1 },
  name: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  location: { fontSize: 14, color: "#8A7A6E" },
  ratingBox: { alignItems: "flex-end" },
  ratingText: { fontSize: 16, fontWeight: "700" },
  reviewCount: { fontSize: 12, color: "#8A7A6E" },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnWhite: { color: "#fff", fontSize: 12, fontWeight: "700" },
  actionBtnText: { fontSize: 12, fontWeight: "700" },
  badgeRow: { flexDirection: "row", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  modeBadgeText: { fontSize: 12, fontWeight: "700" },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  sectionAddBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  description: { fontSize: 15, lineHeight: 22, color: "#444" },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  amenityText: { fontSize: 13 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  roomType: { fontSize: 12, color: "#8A7A6E", marginBottom: 6 },
  roomPrice: { fontSize: 16, fontWeight: "800" },
  perNight: { fontSize: 12, fontWeight: "400" },
  bookButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  bookButtonText: { color: "#fff", fontWeight: "700" },
  editRoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  catList: { gap: 8, paddingBottom: 14 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  catText: { fontSize: 12, fontWeight: "600", color: "#8A7A6E" },
  menuCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  menuLeft: { flexDirection: "row", gap: 10, flex: 1, alignItems: "flex-start" },
  vegDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  menuInfo: { flex: 1 },
  menuName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  menuDesc: { fontSize: 12, color: "#8A7A6E", marginBottom: 4 },
  menuCategory: { fontSize: 11, color: "#8A7A6E", fontWeight: "500" },
  menuPrice: { fontSize: 15, fontWeight: "800", marginLeft: 10 },
  reviewCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE4DC",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewerAvatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  reviewerName: { fontWeight: "700", fontSize: 14 },
  reviewRating: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 14, color: "#444", lineHeight: 20, marginBottom: 8 },
  reviewDate: { fontSize: 11, color: "#8A7A6E" },
  writeReviewBtn: { fontSize: 13, fontWeight: "700" },
  reviewPhotosScroll: {
    marginTop: 12,
    marginBottom: 12,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  hostReplyCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  hostReplyLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  hostReplyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  helpfulBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  helpfulText: {
    fontSize: 12,
  },
  emptyText: { color: "#8A7A6E", fontStyle: "italic" },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FAF6F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  hostAvatarText: { fontSize: 24, fontWeight: "800" },
  hostInfo: { flex: 1 },
  hostName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  hostSince: { fontSize: 12, marginBottom: 8 },
  hostStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostStat: { alignItems: "center" },
  hostStatValue: { fontSize: 16, fontWeight: "800" },
  hostStatLabel: { fontSize: 10, color: "#8A7A6E" },
  hostStatDivider: { width: 1, height: 24, marginHorizontal: 16 },
  similarList: { gap: 12, paddingBottom: 8 },
  similarCard: {
    width: 180,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  similarImage: { width: "100%", height: 100 },
  similarName: { fontSize: 14, fontWeight: "600", padding: 12, paddingTop: 8 },
  similarPrice: { fontSize: 14, fontWeight: "700", paddingHorizontal: 12, paddingBottom: 12 },
  similarPerNight: { fontSize: 11, fontWeight: "400" },
});
