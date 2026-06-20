import {
  ActivityIndicator,
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
import { useGetRoomAvailability } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function AvailabilityScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading } = useGetRoomAvailability(roomId!);

  const bookedDates = data?.bookedDates || [];

  // Simple mock calendar render
  const renderCalendar = () => {
    const days = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Just showing next 30 days for simplicity
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentYear, currentMonth, today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const isBooked = bookedDates.includes(dateStr);
      
      days.push(
        <View
          key={dateStr}
          style={[
            styles.dayCell,
            { borderColor: colors.border },
            isBooked && { backgroundColor: colors.muted }
          ]}
        >
          <Text style={[styles.dayText, isBooked && { color: colors.mutedForeground }]}>
            {date.getDate()}
          </Text>
          {isBooked && <Text style={styles.bookedLabel}>Booked</Text>}
        </View>
      );
    }
    return days;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.monthTitle}>Next 30 Days</Text>
          <View style={styles.grid}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              renderCalendar()
            )}
          </View>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: colors.muted }]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  calendarCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  dayCell: {
    width: "18%",
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bookedLabel: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  legend: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    color: "#666",
  },
});
