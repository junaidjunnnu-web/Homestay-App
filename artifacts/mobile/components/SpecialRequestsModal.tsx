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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const REQUEST_TYPES = [
  { key: "special_request", label: "Special Request", icon: "document-text", description: "Dietary needs, early check-in, etc." },
  { key: "surprise", label: "Surprise Arrangement", icon: "gift", description: "Birthday, anniversary, etc." },
];

const PRIORITIES = [
  { key: "low", label: "Low", color: "#10B981" },
  { key: "normal", label: "Normal", color: "#F59E0B" },
  { key: "high", label: "High", color: "#EF4444" },
];

interface SpecialRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

export default function SpecialRequestsModal({ visible, onClose, booking, onSuccess }: SpecialRequestsModalProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [requestType, setRequestType] = useState<"special_request" | "surprise">("special_request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [price, setPrice] = useState("");
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: existingRequests, isLoading } = useQuery({
    queryKey: ["specialRequests", booking?.id],
    queryFn: async () => {
      const token = await AsyncStorage.getItem("homestay_token");
      const response = await fetch(`${API_BASE}/bookings/${booking.id}/special-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch requests");
      return response.json();
    },
    enabled: !!booking?.id,
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem("homestay_token");
      const response = await fetch(`${API_BASE}/bookings/${booking.id}/special-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestType,
          title: title.trim(),
          description: description.trim(),
          priority,
          price: price.trim() || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create request");
      }
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Your request has been submitted!");
      queryClient.invalidateQueries({ queryKey: ["specialRequests", booking.id] });
      resetForm();
      onSuccess();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit request. Please try again.");
    },
  });

  const pickPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - proofPhotos.length,
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

      setProofPhotos([...proofPhotos, ...uploadedUrls]);
    } catch (error) {
      Alert.alert("Upload Error", "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setProofPhotos(proofPhotos.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setRequestType("special_request");
    setTitle("");
    setDescription("");
    setPriority("normal");
    setPrice("");
    setProofPhotos([]);
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Required", "Please fill in the title and description");
      return;
    }
    createRequestMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "#10B981";
      case "completed": return "#3B82F6";
      case "declined": return "#EF4444";
      default: return "#F59E0B";
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#E8824A" }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Special Requests</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* Existing Requests */}
          {isLoading ? (
            <ActivityIndicator size="large" color="#E8824A" style={{ marginTop: 20 }} />
          ) : existingRequests && existingRequests.length > 0 ? (
            <View style={styles.existingSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Requests</Text>
              {existingRequests.map((req: any) => (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.requestHeader}>
                    <View style={[styles.requestTypeBadge, { backgroundColor: req.requestType === "surprise" ? "#EC489920" : "#3B82F620" }]}>
                      <Ionicons name={req.requestType === "surprise" ? "gift" : "document-text"} size={16} color={req.requestType === "surprise" ? "#EC4899" : "#3B82F6"} />
                      <Text style={[styles.requestTypeText, { color: req.requestType === "surprise" ? "#EC4899" : "#3B82F6" }]}>
                        {req.requestType === "surprise" ? "Surprise" : "Request"}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + "20" }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                        {req.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.requestTitle, { color: colors.foreground }]}>{req.title}</Text>
                  <Text style={[styles.requestDescription, { color: colors.mutedForeground }]}>{req.description}</Text>
                  {req.price && (
                    <Text style={[styles.requestPrice, { color: colors.primary }]}>Additional Cost: ₹{req.price}</Text>
                  )}
                  {req.hostNotes && (
                    <View style={[styles.hostNotes, { backgroundColor: colors.background }]}>
                      <Text style={[styles.hostNotesLabel, { color: colors.mutedForeground }]}>Host Notes:</Text>
                      <Text style={[styles.hostNotesText, { color: colors.foreground }]}>{req.hostNotes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {/* New Request Form */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>New Request</Text>

            {/* Request Type */}
            <Text style={[styles.label, { color: colors.foreground }]}>Request Type</Text>
            <View style={styles.typeButtons}>
              {REQUEST_TYPES.map((type) => (
                <Pressable
                  key={type.key}
                  style={[
                    styles.typeButton,
                    requestType === type.key
                      ? { backgroundColor: "#E8824A", borderColor: "#E8824A" }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setRequestType(type.key as any)}
                >
                  <Ionicons name={type.icon as any} size={20} color={requestType === type.key ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.typeButtonText, { color: requestType === type.key ? "#fff" : colors.foreground }]}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Title */}
            <Text style={[styles.label, { color: colors.foreground }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g., Early Check-in Request"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            {/* Description */}
            <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Describe your request in detail..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />

            {/* Priority */}
            <Text style={[styles.label, { color: colors.foreground }]}>Priority</Text>
            <View style={styles.priorityButtons}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p.key}
                  style={[
                    styles.priorityButton,
                    priority === p.key
                      ? { backgroundColor: p.color, borderColor: p.color }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setPriority(p.key)}
                >
                  <Text style={[styles.priorityButtonText, { color: priority === p.key ? "#fff" : colors.foreground }]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Price (Optional) */}
            <Text style={[styles.label, { color: colors.foreground }]}>Additional Cost (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="₹0"
              placeholderTextColor={colors.mutedForeground}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />

            {/* Submit */}
            <Pressable
              style={[styles.submitButton, { backgroundColor: "#E8824A" }]}
              onPress={handleSubmit}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

import { Image } from "react-native";

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
  content: { flex: 1, padding: 16 },
  existingSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  requestTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requestTypeText: { fontSize: 11, fontWeight: "700" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  requestTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  requestDescription: { fontSize: 14, marginBottom: 8 },
  requestPrice: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  hostNotes: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  hostNotesLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  hostNotesText: { fontSize: 13 },
  formSection: {},
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  typeButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeButtonText: { fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 16,
  },
  priorityButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityButtonText: { fontSize: 13, fontWeight: "600" },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
