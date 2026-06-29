import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { useColors } from "@/hooks/useColors";
import { CameraView, useCameraPermissions } from "expo-camera";

interface UPIScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}

export default function UPIScannerModal({ visible, onClose, onScanned }: UPIScannerModalProps) {
  const colors = useColors();
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible) {
      setScanned(false);
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible, permission, requestPermission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    // Check if it's a UPI payment link
    if (data.includes("upi://pay") || data.includes("upi.link")) {
      setScanned(true);
      onScanned(data);
    }
  };

  const openGallery = () => {
    Alert.alert("Gallery", "Please select a payment screenshot from your gallery to verify the payment.");
    // This would integrate with expo-image-picker to scan QR codes from images
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: "#E8824A" }]}>
            <Pressable onPress={onClose} style={styles.headerButton}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Scan Payment QR</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera" size={64} color={colors.mutedForeground} />
            <Text style={[styles.permissionText, { color: colors.foreground }]}>
              Camera permission is required to scan QR codes
            </Text>
            <Pressable
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#E8824A" }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Payment QR</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.scanCorner, styles.topLeft]} />
                <View style={[styles.scanCorner, styles.topRight]} />
                <View style={[styles.scanCorner, styles.bottomLeft]} />
                <View style={[styles.scanCorner, styles.bottomRight]} />
              </View>
              <Text style={[styles.scanText, { color: "#fff" }]}>
                {scanned ? "Payment QR Detected!" : "Align QR code within frame"}
              </Text>
            </View>
          </CameraView>
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.surface }]}>
          <Text style={[styles.instructionsTitle, { color: colors.foreground }]}>
            How to verify payment:
          </Text>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>
              Ask guest to show their payment confirmation
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>
              Scan the QR code from their UPI app
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>
              Or verify transaction ID manually
            </Text>
          </View>
        </View>

        {/* Manual Entry */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.manualButton, { backgroundColor: colors.primary }]}
            onPress={openGallery}
          >
            <Ionicons name="image" size={20} color="#fff" />
            <Text style={styles.manualButtonText}>Select from Gallery</Text>
          </Pressable>
        </View>
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
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#E8824A",
    borderRadius: 12,
    position: "relative",
  },
  scanCorner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#E8824A",
    borderWidth: 4,
  },
  topLeft: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 12 },
  topRight: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 12 },
  bottomLeft: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 12 },
  scanText: { fontSize: 14, fontWeight: "600", marginTop: 20 },
  instructions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  instructionsTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  instructionText: { fontSize: 14, flex: 1 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  manualButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
