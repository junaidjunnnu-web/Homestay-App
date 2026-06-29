import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const RATING_CATEGORIES = [
  { key: "cleanliness", label: "Cleanliness", icon: "sparkles" },
  { key: "location", label: "Location", icon: "map-pin" },
  { key: "value", label: "Value for Money", icon: "dollar-sign" },
  { key: "amenities", label: "Amenities", icon: "home" },
  { key: "hospitality", label: "Hospitality", icon: "heart" },
];

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  property: any;
  onSuccess: () => void;
}

export default function ReviewModal({ visible, onClose, property, onSuccess }: ReviewModalProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [ratings, setRatings] = useState<Record<string, number>>({
    cleanliness: 5,
    location: 5,
    value: 5,
    amenities: 5,
    hospitality: 5,
  });
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem("homestay_token");
      const response = await fetch(`${API_BASE}/properties/${property.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cleanlinessRating: ratings.cleanliness,
          locationRating: ratings.location,
          valueRating: ratings.value,
          amenitiesRating: ratings.amenities,
          hospitalityRating: ratings.hospitality,
          comment: comment.trim(),
          photos: photos.length > 0 ? photos : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit review");
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Thank you for your review!");
      queryClient.invalidateQueries({ queryKey: ["propertyReviews", property.id] });
      resetForm();
      onClose();
      onSuccess();
    },
    onError: () => {
      Alert.alert("Error", "Failed to submit review. Please try again.");
    },
  });

  const pickPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets) {
        await uploadPhotos(result.assets.map((a) => a.uri));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick photos");
    }
  };

  const uploadPhotos = async (uris: string[]) => {
    setUploading(true);
    const baseUrl = process.env.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL.replace("/api", "")
      : "https://homestay-booking--junaid001.replit.app";
    const uploadedUrls: string[] = [];

    try {
      for (const uri of uris) {
        const formData = new FormData();
        formData.append("file", {
          uri,
          type: "image/jpeg",
          name: `photo_${Date.now()}.jpg`,
        } as any);

        const response = await fetch(`${baseUrl}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        let imageUrl = data.url;
        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        uploadedUrls.push(imageUrl);
      }

      setPhotos([...photos, ...uploadedUrls]);
    } catch (error) {
      Alert.alert("Upload Error", "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setRatings({
      cleanliness: 5,
      location: 5,
      value: 5,
      amenities: 5,
      hospitality: 5,
    });
    setComment("");
    setPhotos([]);
  };

  const handleSubmit = () => {
    if (comment.trim().length === 0) {
      Alert.alert("Required", "Please write a comment for your review");
      return;
    }
    submitReviewMutation.mutate();
  };

  const overallRating = Object.values(ratings).reduce((sum, r) => sum + r, 0) / 5;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Write a Review</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* Property Info */}
            <View style={[styles.propertyCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.propertyName, { color: colors.foreground }]}>{property?.name}</Text>
              <Text style={[styles.propertyLocation, { color: colors.mutedForeground }]}>
                {property?.location}
              </Text>
            </View>

            {/* Overall Rating */}
            <View style={styles.ratingSummary}>
              <Text style={[styles.overallLabel, { color: colors.foreground }]}>Overall Rating</Text>
              <View style={styles.overallRating}>
                <Text style={[styles.overallScore, { color: "#E8824A" }]}>
                  {overallRating.toFixed(1)}
                </Text>
                <Ionicons name="star" size={32} color="#E8824A" />
              </View>
            </View>

            {/* Category Ratings */}
            <View style={styles.categories}>
              {RATING_CATEGORIES.map((category) => (
                <View key={category.key} style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <Feather name={category.icon as any} size={18} color={colors.mutedForeground} />
                    <Text style={[styles.categoryLabel, { color: colors.foreground }]}>{category.label}</Text>
                  </View>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setRatings({ ...ratings, [category.key]: star })}
                      >
                        <Ionicons
                          name={star <= ratings[category.key] ? "star" : "star-outline"}
                          size={24}
                          color={star <= ratings[category.key] ? "#E8824A" : colors.mutedForeground}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Comment */}
            <View style={styles.commentSection}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Your Review</Text>
              <TextInput
                style={[styles.commentInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Share your experience with this property..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={6}
                value={comment}
                onChangeText={setComment}
                maxLength={1000}
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {comment.length}/1000
              </Text>
            </View>

            {/* Photos */}
            <View style={styles.photosSection}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Add Photos (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                    <Image source={{ uri: photo }} style={styles.photo} />
                    <Pressable
                      style={[styles.photoRemove, { backgroundColor: "rgba(0,0,0,0.6)" }]}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 5 && !uploading && (
                  <Pressable
                    style={[styles.photoAdd, { borderColor: colors.border }]}
                    onPress={pickPhotos}
                  >
                    <Ionicons name="camera" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.photoAddText, { color: colors.mutedForeground }]}>Add</Text>
                  </Pressable>
                )}
                {uploading && (
                  <View style={[styles.photoAdd, { borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color="#E8824A" />
                  </View>
                )}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.submitButton, { backgroundColor: "#E8824A" }]}
              onPress={handleSubmit}
              disabled={submitReviewMutation.isPending}
            >
              {submitReviewMutation.isPending ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { Image } from "react-native";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  title: { fontSize: 20, fontWeight: "700" },
  content: { flex: 1, padding: 20 },
  propertyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  propertyName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  propertyLocation: { fontSize: 14 },
  ratingSummary: {
    alignItems: "center",
    marginBottom: 24,
  },
  overallLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  overallRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overallScore: { fontSize: 48, fontWeight: "800" },
  categories: { marginBottom: 24 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  categoryLabel: { fontSize: 14, fontWeight: "600" },
  stars: {
    flexDirection: "row",
    gap: 4,
  },
  commentSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  commentInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 120,
  },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 4 },
  photosSection: { marginBottom: 24 },
  photosScroll: { marginBottom: 8 },
  photoContainer: {
    width: 80,
    height: 80,
    marginRight: 10,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photo: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  photoAddText: { fontSize: 12, fontWeight: "600" },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
