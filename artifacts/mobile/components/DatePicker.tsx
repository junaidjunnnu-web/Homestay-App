import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  label?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(s: string): string {
  const d = parseDate(s);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  maxDate,
  label,
}: DatePickerProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const selected = parseDate(value);
  const min = parseDate(minDate || "") || today;
  const max = parseDate(maxDate || "");

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < min) return true;
    if (max && d > max) return true;
    return false;
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day;
  };

  const isToday = (day: number) => {
    return today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day;
  };

  const selectDay = (day: number) => {
    if (isDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    onChange(toIsoDate(d));
    setOpen(false);
  };

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: value ? colors.primary : colors.border }]}
        onPress={() => setOpen(true)}
      >
        <Feather name="calendar" size={18} color={value ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.triggerText, { color: value ? "#222" : colors.mutedForeground }]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.sheetHeader, { backgroundColor: colors.primary }]}>
            {label && <Text style={styles.sheetLabel}>{label}</Text>}
            <View style={styles.monthNav}>
              <Pressable style={styles.navBtn} onPress={prevMonth}>
                <Feather name="chevron-left" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.monthYear}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Pressable style={styles.navBtn} onPress={nextMonth}>
                <Feather name="chevron-right" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Day labels */}
          <View style={styles.dayLabels}>
            {DAYS.map(d => (
              <Text key={d} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {calendarDays.map((day, idx) => {
              if (day === null) return <View key={idx} style={styles.cell} />;
              const disabled = isDisabled(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.cell,
                    styles.dayCell,
                    sel && { backgroundColor: colors.primary },
                    !sel && tod && { borderWidth: 2, borderColor: colors.primary },
                    disabled && styles.disabledCell,
                  ]}
                  onPress={() => selectDay(day)}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.dayNum,
                    sel && { color: "#fff", fontWeight: "800" },
                    disabled && styles.disabledText,
                    !sel && tod && { color: colors.primary, fontWeight: "800" },
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quick picks */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
            {[
              { label: "Today", days: 0 },
              { label: "Tomorrow", days: 1 },
              { label: "+2 days", days: 2 },
              { label: "+3 days", days: 3 },
              { label: "+1 week", days: 7 },
              { label: "+2 weeks", days: 14 },
            ].map(({ label, days }) => {
              const d = new Date();
              d.setDate(d.getDate() + days);
              const ds = toIsoDate(d);
              const dis = d < min || (max && d > max);
              return (
                <Pressable
                  key={label}
                  style={[styles.quickBtn, { borderColor: colors.border, backgroundColor: colors.surface }, dis && { opacity: 0.4 }]}
                  onPress={() => { if (!dis) { onChange(ds); setOpen(false); } }}
                  disabled={!!dis}
                >
                  <Text style={[styles.quickBtnText, { color: colors.primary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setOpen(false)}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  triggerText: { flex: 1, fontSize: 15 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 16,
  },
  sheetLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { padding: 8 },
  monthYear: { fontSize: 18, fontWeight: "800", color: "#fff" },
  dayLabels: { flexDirection: "row", paddingHorizontal: 12, marginTop: 12 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: "#8A7A6E" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 8 },
  cell: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", marginVertical: 2 },
  dayCell: { borderRadius: 22 },
  dayNum: { fontSize: 15, color: "#222" },
  disabledCell: { opacity: 0.25 },
  disabledText: { color: "#999" },
  quickRow: { paddingHorizontal: 12, marginTop: 16, marginBottom: 8 },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickBtnText: { fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700" },
});
