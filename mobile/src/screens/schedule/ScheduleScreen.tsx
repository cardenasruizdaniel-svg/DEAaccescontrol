import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useTheme } from "../../theme/ThemeContext";
import { Shift } from "../../types";
import { scheduleShiftReminder, addNotificationListener } from "../../services/notifications";
import { toLocalDateStr } from "../../utils/dateUtils";
import OfflineBanner from "../../components/OfflineBanner";

const { width } = Dimensions.get("window");
type ViewMode = "day" | "week" | "month";

export default function ScheduleScreen({ navigation }: any) {
  const { employeeId } = useAuthStore();
  const { theme } = useTheme();
  const { shifts, fetchShifts, isLoading } = useScheduleStore();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const { start, end } = getDateRange(viewMode, selectedDate);

  useEffect(() => {
    if (!employeeId) return;
    fetchShifts(start, end);
  }, [employeeId, start, end, fetchShifts]);

  useEffect(() => {
    if (!shifts || shifts.length === 0) return;
    shifts.forEach((shift) => {
      if (shift.status === "scheduled" && shift.shift_date) {
        scheduleShiftReminder(shift.name, shift.start_time, shift.shift_date).catch(() => {});
      }
    });
  }, [shifts]);

  useEffect(() => {
    const sub = addNotificationListener(() => {
      if (!employeeId) return;
      fetchShifts(start, end);
    });
    return () => sub.remove();
  }, [employeeId, start, end, fetchShifts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShifts(start, end);
    setRefreshing(false);
  };

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    if (viewMode === "day") d.setDate(d.getDate() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  const handleStartShift = (shift: Shift) => {
    navigation.navigate("Turno", { shiftId: shift.id });
  };

  const handleNavigateShift = (shift: Shift) => {
    navigation.navigate("ShiftDetail", { shift, showActions: true });
  };

  const s = styles(theme);
  const shiftsByDate = groupShiftsByDate(shifts);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Mi Programación</Text>
        <View style={s.viewToggle}>
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[s.viewBtn, viewMode === mode && s.viewBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[s.viewBtnText, viewMode === mode && s.viewBtnTextActive]}>
                {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.navBar}>
        <TouchableOpacity onPress={() => navigateDate(-1)} style={s.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={s.navCenter}>
          <Text style={s.navDateText}>{formatNavDate(viewMode, selectedDate)}</Text>
          <Text style={s.navTodayText}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateDate(1)} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {viewMode === "week" && (
        <WeekBar selectedDate={selectedDate} theme={theme} onSelect={(d) => { setSelectedDate(d); setViewMode("day"); }} />
      )}

      <OfflineBanner />

      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {viewMode === "day" ? (
          <>
            {shifts.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="calendar-outline" size={40} color={theme.colors.textMuted} />
                <Text style={s.emptyText}>Sin turnos para este día</Text>
              </View>
            ) : (
              shifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  theme={theme}
                  onPress={() => navigation.navigate("ShiftDetail", { shift, showActions: true })}
                  onStart={shift.status === "scheduled" ? () => handleStartShift(shift) : undefined}
                  onNavigate={shift.client_name ? () => handleNavigateShift(shift) : undefined}
                />
              ))
            )}
          </>
        ) : (
          Object.entries(shiftsByDate).sort().map(([date, dayShifts]) => (
            <View key={date} style={s.dateGroup}>
              <Text style={s.dateLabel}>{formatDateLabel(date)}</Text>
              {dayShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  theme={theme}
                  onPress={() => navigation.navigate("ShiftDetail", { shift, showActions: true })}
                  onStart={shift.status === "scheduled" ? () => handleStartShift(shift) : undefined}
                  onNavigate={shift.client_name ? () => handleNavigateShift(shift) : undefined}
                  compact
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function ShiftCard({ shift, theme, onPress, onStart, onNavigate, compact }: { shift: Shift; theme: any; onPress: () => void; onStart?: () => void; onNavigate?: () => void; compact?: boolean }) {
  const statusColors: Record<string, string> = {
    scheduled: theme.colors.info,
    in_progress: theme.colors.warning,
    completed: theme.colors.success,
    cancelled: theme.colors.danger,
  };
  const statusLabels: Record<string, string> = {
    scheduled: "Programado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
  };
  const c = statusColors[shift.status] || theme.colors.textMuted;

  return (
    <TouchableOpacity style={[cardStyles.card, { backgroundColor: theme.colors.surface, borderLeftColor: shift.color || theme.colors.primary }]} onPress={onPress} activeOpacity={0.7}>
      <View style={cardStyles.timeCol}>
        <Text style={[cardStyles.time, { color: theme.colors.text }]}>{shift.start_time}</Text>
        <View style={[cardStyles.line, { backgroundColor: theme.colors.border }]} />
        <Text style={[cardStyles.time, { color: theme.colors.text }]}>{shift.end_time}</Text>
      </View>
      <View style={cardStyles.info}>
        <Text style={[cardStyles.name, { color: theme.colors.text }]}>{shift.name}</Text>
        {!compact && shift.client_name && <Text style={[cardStyles.client, { color: theme.colors.textSecondary }]}>{shift.client_name}</Text>}
        {!compact && shift.persona_name && <Text style={[cardStyles.patient, { color: theme.colors.textMuted }]}>{shift.persona_name}</Text>}
        {(onStart || onNavigate) && (
          <View style={cardStyles.actions}>
            {onStart && (
              <TouchableOpacity style={[cardStyles.actionBtn, { backgroundColor: theme.colors.success }]} onPress={onStart}>
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={cardStyles.actionText}>Iniciar</Text>
              </TouchableOpacity>
            )}
            {onNavigate && (
              <TouchableOpacity style={[cardStyles.actionBtn, { backgroundColor: theme.colors.info }]} onPress={onNavigate}>
                <Ionicons name="navigate" size={12} color="#fff" />
                <Text style={cardStyles.actionText}>Navegar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={[cardStyles.statusBadge, { backgroundColor: c + "18" }]}>
        <Text style={[cardStyles.statusText, { color: c }]}>{statusLabels[shift.status] || shift.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  timeCol: { alignItems: "center", marginRight: 14, width: 48 },
  time: { fontSize: 13, fontWeight: "600" },
  line: { width: 1, height: 20, marginVertical: 4 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  client: { fontSize: 13, marginTop: 2 },
  patient: { fontSize: 12, marginTop: 1 },
  actions: { flexDirection: "row", gap: 6, marginTop: 6 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "600" },
});

function WeekBar({ selectedDate, theme, onSelect }: { selectedDate: Date; theme: any; onSelect: (d: Date) => void }) {
  const startOfWeek = getWeekStart(selectedDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const today = toLocalDateStr();
  const dayNames = ["D", "L", "M", "X", "J", "V", "S"];

  return (
    <View style={weekStyles.container}>
      {days.map((d, i) => {
        const dateStr = toLocalDateStr(d);
        const isSelected = dateStr === toLocalDateStr(selectedDate);
        const isToday = dateStr === today;
        return (
          <TouchableOpacity key={i} style={[weekStyles.day, isSelected && { backgroundColor: theme.colors.primary }]} onPress={() => onSelect(d)}>
            <Text style={[weekStyles.dayName, { color: isSelected ? "#fff" : theme.colors.textMuted }]}>{dayNames[i]}</Text>
            <Text style={[weekStyles.dayNum, { color: isSelected ? "#fff" : isToday ? theme.colors.primary : theme.colors.text }]}>{d.getDate()}</Text>
            {isToday && !isSelected && <View style={[weekStyles.dot, { backgroundColor: theme.colors.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const weekStyles = StyleSheet.create({
  container: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 12, paddingVertical: 8 },
  day: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, minWidth: 40 },
  dayName: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  dayNum: { fontSize: 16, fontWeight: "bold" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
});

function getDateRange(mode: ViewMode, date: Date) {
  const d = new Date(date);
  if (mode === "day") {
    const s = toLocalDateStr(d);
    return { start: s, end: s };
  }
  if (mode === "week") {
    const start = getWeekStart(d);
    const end = getWeekEnd(d);
    return { start, end };
  }
  const start = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = toLocalDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  return toLocalDateStr(d);
}

function getWeekEnd(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 7);
  return toLocalDateStr(d);
}

function groupShiftsByDate(shifts: Shift[]) {
  const groups: Record<string, Shift[]> = {};
  for (const s of shifts) {
    if (!groups[s.shift_date]) groups[s.shift_date] = [];
    groups[s.shift_date].push(s);
  }
  return groups;
}

function formatNavDate(mode: ViewMode, date: Date) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  if (mode === "day") return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  if (mode === "week") {
    const start = getWeekStart(date);
    const end = getWeekEnd(date);
    const sd = new Date(start + "T12:00:00");
    const ed = new Date(end + "T12:00:00");
    return `${sd.getDate()} ${months[sd.getMonth()]} - ${ed.getDate()} ${months[ed.getMonth()]}`;
  }
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: "bold", color: t.colors.text, marginBottom: 12 },
    viewToggle: { flexDirection: "row", backgroundColor: t.colors.surfaceVariant, borderRadius: 10, padding: 3 },
    viewBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
    viewBtnActive: { backgroundColor: t.colors.primary },
    viewBtnText: { fontSize: 13, fontWeight: "600", color: t.colors.textSecondary },
    viewBtnTextActive: { color: "#fff" },
    navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
    navBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    navCenter: { alignItems: "center" },
    navDateText: { fontSize: 16, fontWeight: "600", color: t.colors.text },
    navTodayText: { fontSize: 12, color: t.colors.primary, marginTop: 2 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20 },
    emptyCard: { backgroundColor: t.colors.surface, borderRadius: 14, padding: 40, alignItems: "center" },
    emptyText: { fontSize: 14, color: t.colors.textMuted, marginTop: 12 },
    dateGroup: { marginBottom: 16 },
    dateLabel: { fontSize: 14, fontWeight: "600", color: t.colors.textSecondary, marginBottom: 8, marginLeft: 4 },
  });
}
