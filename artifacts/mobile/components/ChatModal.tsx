import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
import { useColors } from "@/hooks/useColors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { normalizePhone } from "@/utils/whatsapp";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  booking?: any | null;
  currentUser?: any | null;
}

export default function ChatModal({ visible, onClose, booking, currentUser }: ChatModalProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState("");

  const normalizePhoneLocal = (raw: string | number | undefined | null) => normalizePhone(raw);

  const openWhatsApp = () => {
    if (!booking || !currentUser) {
      Alert.alert("Unavailable", "Booking information is not loaded yet.");
      return;
    }
    const phone = booking.guestId === currentUser.id ? booking.property?.phone : booking.guestMobile;
    const name = booking.guestId === currentUser.id ? booking.property?.name || "Host" : booking.guestName || "Guest";
    const cleanPhone = normalizePhoneLocal(phone);
    if (!cleanPhone) {
      Alert.alert("WhatsApp Unavailable", "No phone number available to open WhatsApp.");
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${name}, I wanted to continue our booking conversation from Homestay App.`)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open WhatsApp.");
    });
  };

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", booking?.id],
    queryFn: async () => {
      if (!booking?.id) {
        return [];
      }
      const response = await apiFetch(`/messages/booking/${booking.id}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: visible && !!booking?.id,
    refetchInterval: visible ? 5000 : false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!booking || !currentUser) {
        throw new Error("Booking or user data missing");
      }
      const receiverId = booking.guestId === currentUser.id ? booking.property?.hostId : booking.guestId;

      const response = await apiFetch("/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          receiverId,
          content,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", booking.id] });
      setMessage("");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to send message");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiFetch(`/messages/${messageId}/read`, { method: "PATCH" });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
  });

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages && messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  const isOwnMessage = (msg: any) => currentUser && msg.senderId === currentUser.id;

  if (!booking || !currentUser) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#E8824A", paddingTop: Platform.OS === "ios" ? 50 : 20 }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {booking.guestId === currentUser.id ? booking.property?.name : booking.guestName}
            </Text>
            <Text style={styles.headerSubtitle}>Booking #{booking.referenceNumber}</Text>
          </View>
          <Pressable onPress={openWhatsApp} style={styles.whatsappButton}>
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#E8824A" style={{ marginTop: 20 }} />
          ) : messages && messages.length > 0 ? (
            messages.map((msg: any) => {
              const own = isOwnMessage(msg);
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    own ? styles.ownMessageRow : styles.otherMessageRow,
                  ]}
                >
                  {!own && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {msg.sender?.name?.charAt(0) || "?"}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      own
                        ? { backgroundColor: "#E8824A" }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.messageText, own ? { color: "#fff" } : { color: colors.foreground }]}>
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        own ? { color: "rgba(255,255,255,0.7)" } : { color: colors.mutedForeground },
                      ]}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {own && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {currentUser.name?.charAt(0) || "?"}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={64} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, { backgroundColor: message.trim() ? "#E8824A" : colors.muted }]}
            onPress={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size={20} color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: { padding: 8 },
  headerInfo: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16 },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    gap: 8,
  },
  ownMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: { fontSize: 14, marginTop: 16, textAlign: "center" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },  whatsappButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#25D366",
  },});
