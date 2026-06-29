import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const colors = useColors();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickImages = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: maxImages - images.length,
      });

      if (!result.canceled && result.assets) {
        const validImages = result.assets.filter((asset) => {
          if (!asset.fileSize) return true;
          const sizeMB = asset.fileSize / (1024 * 1024);
          if (sizeMB > maxSizeMB) {
            Alert.alert("File Too Large", `Image exceeds ${maxSizeMB}MB limit`);
            return false;
          }
          return true;
        });

        if (validImages.length > 0) {
          await uploadImages(validImages.map((a) => a.uri));
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick images");
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImages([result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const uploadImages = async (uris: string[]) => {
    setUploading(true);
    setUploadProgress(0);

    // Use the same base URL as the app configuration
    const baseUrl = process.env.EXPO_PUBLIC_API_URL 
      ? process.env.EXPO_PUBLIC_API_URL.replace('/api', '')
      : "https://homestay-booking--junaid001.replit.app";
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < uris.length; i++) {
        const formData = new FormData();
        formData.append("file", {
          uri: uris[i],
          type: "image/jpeg",
          name: `image_${Date.now()}_${i}.jpg`,
        } as any);

        const response = await fetch(`${baseUrl}/api/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          console.error("Upload failed:", errorText);
          throw new Error(`Upload failed: ${errorText}`);
        }

        const data = await response.json();
        
        // Handle both url and path formats
        let imageUrl = data.url;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        
        uploadedUrls.push(imageUrl);

        setUploadProgress(((i + 1) / uris.length) * 100);
      }

      onImagesChange([...images, ...uploadedUrls]);
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload Error", error.message || "Failed to upload images. Please check your connection and try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Images</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {images.length}/{maxImages}
        </Text>
      </View>

      {uploading && (
        <View style={[styles.uploadProgress, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color="#E8824A" />
          <Text style={[styles.uploadProgressText, { color: colors.mutedForeground }]}>
            Uploading... {Math.round(uploadProgress)}%
          </Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {images.map((imageUrl, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
            <Pressable
              style={[styles.removeButton, { backgroundColor: "rgba(0,0,0,0.6)" }]}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
            <View style={[styles.imageIndex, { backgroundColor: "#E8824A" }]}>
              <Text style={styles.imageIndexText}>{index + 1}</Text>
            </View>
          </View>
        ))}

        {images.length < maxImages && !uploading && (
          <Pressable style={[styles.addButton, { borderColor: colors.border }]} onPress={pickImages}>
            <Feather name="image" size={24} color={colors.mutedForeground} />
            <Text style={[styles.addButtonText, { color: colors.mutedForeground }]}>
              Add Photos
            </Text>
          </Pressable>
        )}

        {images.length < maxImages && !uploading && (
          <Pressable style={[styles.addButton, { borderColor: colors.border }]} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color={colors.mutedForeground} />
            <Text style={[styles.addButtonText, { color: colors.mutedForeground }]}>
              Take Photo
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.infoBox, { backgroundColor: "#E8824A10", borderColor: "#E8824A30" }]}>
        <Feather name="info" size={14} color="#E8824A" />
        <Text style={[styles.infoText, { color: "#92400E" }]}>
          JPG, PNG only • Max {maxSizeMB}MB per image • Up to {maxImages} images
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "700" },
  count: { fontSize: 13, fontWeight: "600" },
  uploadProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  uploadProgressText: { fontSize: 13 },
  imageScroll: { marginBottom: 12 },
  imageContainer: {
    width: 120,
    height: 90,
    marginRight: 10,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndex: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndexText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addButton: {
    width: 120,
    height: 90,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: { fontSize: 12, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: { fontSize: 12, flex: 1 },
});
