import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

interface ImageGalleryProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImageGallery({ images, initialIndex = 0, visible, onClose }: ImageGalleryProps) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!visible || images.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.closeArea} onPress={onClose}>
          <Ionicons name="close" size={32} color="#fff" style={styles.closeButton} />
        </Pressable>

        <View style={styles.galleryContainer}>
          <Pressable style={styles.navButton} onPress={goToPrevious} hitSlop={20}>
            <Ionicons name="chevron-back" size={32} color="#fff" />
          </Pressable>

          <View style={styles.imageContainer}>
            <Image source={{ uri: images[currentIndex] }} style={styles.mainImage} resizeMode="contain" />
            <View style={[styles.imageCounter, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          </View>

          <Pressable style={styles.navButton} onPress={goToNext} hitSlop={20}>
            <Ionicons name="chevron-forward" size={32} color="#fff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
          {images.map((imageUrl, index) => (
            <Pressable
              key={index}
              onPress={() => setCurrentIndex(index)}
              style={[
                styles.thumbnail,
                currentIndex === index && styles.activeThumbnail,
              ]}
            >
              <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
              {currentIndex === index && (
                <View style={styles.activeIndicator} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeArea: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8,
  },
  galleryContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  navButton: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
  },
  imageContainer: {
    flex: 1,
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  imageCounter: {
    position: "absolute",
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  thumbnailScroll: {
    position: "absolute",
    bottom: 30,
    paddingHorizontal: 20,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeThumbnail: {
    borderColor: "#E8824A",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  activeIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E8824A",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
