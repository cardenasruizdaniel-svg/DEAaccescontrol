import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions, Image, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useOfflineStore } from "../../stores/offlineStore";
import api from "../../services/api";
import { SkeletonList, SkeletonCard } from "../../components/Skeleton";
import OfflineBanner from "../../components/OfflineBanner";
import { toLocalDateStr } from "../../utils/dateUtils";

const { width } = Dimensions.get("window");

interface ActiveSession {
  active: boolean;
  shift: {
    id: string; name: string; start_time: string; end_time: string;
    client_name?: string; client_id?: string; shift_date: string;
    color?: string; observations?: string;
  } | null;
  session?: { entry_time?: string; inside_geofence?: boolean; face_verified?: boolean; entry_record_id?: string } | null;
  next_shift: {
    id: string; name: string; start_time: string; end_time: string;
    client_name?: string; client_id?: string; shift_date: string; color?: string;
  } | null;
  today_shifts?: any[];
}

export default function DashboardScreen({ navigation }: any) {
  const { user, employeeId } = useAuthStore();
  const { theme } = useTheme();
  const { pendingCount } = useOfflineStore();
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [stats, setStats] = useState({ worked: 0, pending: 0, todayEntries: 0, todayExits: 0, todayAutoClosures: 0 });
  const [loading, setLoading] = useState(true);

  const today = toLocalDateStr();

  const loadData = useCallback(async () => {
    if (!employeeId) return;
    try {
      const [empRes, dashRes, sessionRes] = await Promise.all([
        api.get("/mobile/me/employee").catch(() => null),
        api.get("/mobile/me/dashboard"),
        api.get("/mobile/me/active-session"),
      ]);

      const d = dashRes.data;
      setEmployeeName(d.employee_name || "");
      setTodayShifts(d.today_shifts || []);
      setStats({
        worked: d.week_completed || 0,
        pending: d.week_pending || 0,
        todayEntries: d.today_entries || 0,
        todayExits: d.today_exits || 0,
        todayAutoClosures: d.today_auto_closures || 0,
      });

      const session = sessionRes.data as ActiveSession;
      setActiveSession(session);

      if (empRes?.data?.photo_url) {
        setPhotoUrl(empRes.data.photo_url);
      }
    } catch {
      try {
        const empRes = await api.get(`/employees/${employeeId}`);
        setEmployeeName(`${empRes.data.first_name} ${empRes.data.last_name}`);
      } catch {}
    }

    setLoading(false);
  }, [employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const activeShift = activeSession?.shift;
  const nextShift = activeSession?.next_shift;
  const isActive = activeSession?.active;
  const sessionEntry = activeSession?.session;

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hola, {employeeName || user?.full_name?.split(" ")[0] || "Empleado"}</Text>
          <Text style={s.dateText}>{formatDate(today)}</Text>
        </View>
        <View style={s.headerRight}>
          {pendingCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{pendingCount}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={s.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={s.iconBtn}>
            <Ionicons name="settings-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner />

      {activeSession && (
        <TouchableOpacity
          style={[s.activeSessionCard, { backgroundColor: isActive ? theme.colors.success + "15" : theme.colors.surface }]}
          onPress={() => {
            if (activeShift) navigation.navigate("Turno", { shiftId: activeShift.id });
          }}
          activeOpacity={0.7}
        >
          <View style={[s.sessionIndicator, { backgroundColor: isActive ? theme.colors.success : theme.colors.primary }]}>
            <Ionicons name={isActive ? "play-circle" : "alarm-outline"} size={20} color="#fff" />
          </View>
          <View style={s.sessionInfo}>
            {isActive && activeShift ? (
              <>
                <Text style={s.sessionTitle}>Turno en Progreso</Text>
                <Text style={s.sessionSubtitle}>{activeShift.name}</Text>
                <Text style={s.sessionDetail}>{activeShift.start_time} - {activeShift.end_time}</Text>
                {sessionEntry?.entry_time && (
                  <Text style={s.sessionDetail}>Ingreso: {new Date(sessionEntry.entry_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</Text>
                )}
              </>
            ) : nextShift ? (
              <>
                <Text style={s.sessionTitle}>Próximo Turno</Text>
                <Text style={s.sessionSubtitle}>{nextShift.name}</Text>
                <Text style={s.sessionDetail}>{nextShift.start_time} - {nextShift.end_time} {nextShift.client_name ? `· ${nextShift.client_name}` : ""}</Text>
              </>
            ) : (
              <>
                <Text style={s.sessionTitle}>Sin Turnos</Text>
                <Text style={s.sessionDetail}>No hay turnos programados para hoy</Text>
              </>
            )}
          </View>
          {isActive && <View style={s.pulse}><View style={[s.pulseDot, { backgroundColor: theme.colors.success }]} /></View>}
        </TouchableOpacity>
      )}

      <View style={s.profileCard}>
        <View style={[s.avatar, photoUrl ? { overflow: "hidden" } : { backgroundColor: theme.colors.primary }]}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: 56, height: 56 }} />
          ) : (
            <Text style={s.avatarText}>{(employeeName || "E").charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{employeeName || user?.full_name || "Empleado"}</Text>
          <Text style={s.profileCompany}>{(user as any)?.company_name || "DLA Access Enterprise"}</Text>
        </View>
      </View>

      <View style={s.statsGrid}>
        {loading ? (
          <>
            <SkeletonCard theme={theme} />
            <SkeletonCard theme={theme} />
            <SkeletonCard theme={theme} />
            <SkeletonCard theme={theme} />
          </>
        ) : (
          <>
            <StatCard theme={theme} icon="time-outline" label="Turnos Completados" value={`${stats.worked}`} color={theme.colors.success} />
            <StatCard theme={theme} icon="hourglass-outline" label="Turnos Pendientes" value={`${stats.pending}`} color={theme.colors.warning} />
            <StatCard theme={theme} icon="log-in-outline" label="Ingresos Hoy" value={`${stats.todayEntries}`} color={theme.colors.primary} />
            <StatCard theme={theme} icon="log-out-outline" label="Salidas Hoy" value={`${stats.todayExits}`} color={theme.colors.info} />
          </>
        )}
      </View>

      {stats.todayAutoClosures > 0 && (
        <View style={[s.autoCloseBanner, { backgroundColor: theme.colors.info + "12" }]}>
          <Ionicons name="sync-circle-outline" size={18} color={theme.colors.info} />
          <Text style={[s.autoCloseText, { color: theme.colors.textSecondary }]}>
            {stats.todayAutoClosures} cierre{stats.todayAutoClosures !== 1 ? "s" : ""} automático{stats.todayAutoClosures !== 1 ? "s" : ""} hoy
          </Text>
        </View>
      )}

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Turnos del Día</Text>
          {(activeSession?.today_shifts?.length || 0) > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("Programación")}>
              <Text style={s.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>
        {loading ? (
          <SkeletonList count={3} theme={theme} />
        ) : todayShifts.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.textMuted} />
            <Text style={s.emptyText}>No hay turnos programados para hoy</Text>
          </View>
        ) : (
          todayShifts.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              style={[s.shiftCard, { borderLeftColor: shift.color || theme.colors.primary }]}
              onPress={() => navigation.navigate("ShiftDetail", { shift })}
              activeOpacity={0.7}
            >
              <View style={s.shiftTime}>
                <Text style={s.shiftTimeText}>{shift.start_time}</Text>
                <View style={s.shiftTimeLine} />
                <Text style={s.shiftTimeText}>{shift.end_time}</Text>
              </View>
              <View style={s.shiftInfo}>
                <Text style={s.shiftName}>{shift.name}</Text>
                {shift.client_name && <Text style={s.shiftClient}>{shift.client_name}</Text>}
                {shift.observations && <Text style={s.shiftObs} numberOfLines={1}>{shift.observations}</Text>}
              </View>
              <StatusBadge status={shift.status} theme={theme} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Accesos Rápidos</Text>
        </View>
        <View style={s.quickGrid}>
          {isActive && activeShift ? (
            <QuickAction theme={theme} icon="flag" label="Finalizar\nTurno" color={theme.colors.danger} onPress={() => navigation.navigate("Turno", { shiftId: activeShift.id })} />
          ) : nextShift ? (
            <QuickAction theme={theme} icon="play" label="Iniciar\nTurno" color={theme.colors.success} onPress={() => navigation.navigate("Geolocation", { shiftId: nextShift.id })} />
          ) : (
            <QuickAction theme={theme} icon="briefcase" label="Mi\nTurno" color={theme.colors.success} onPress={() => navigation.navigate("Programación")} />
          )}
          <QuickAction theme={theme} icon="map" label="Geolocalización" color={theme.colors.info} onPress={() => navigation.navigate("Geolocation")} />
          <QuickAction theme={theme} icon="document-text" label="Historial" color={theme.colors.warning} onPress={() => navigation.navigate("History")} />
          <QuickAction theme={theme} icon="wallet" label="Mi Nómina" color={theme.colors.primary} onPress={() => navigation.navigate("Nómina")} />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ theme, icon, label, value, color }: any) {
  return (
    <View style={[statStyles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[statStyles.iconBox, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[statStyles.value, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { width: (width - 48) / 2, borderRadius: 14, padding: 16, marginBottom: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  value: { fontSize: 22, fontWeight: "bold", marginBottom: 2 },
  label: { fontSize: 12, lineHeight: 16 },
});

function StatusBadge({ status, theme }: any) {
  const colors: Record<string, string> = {
    scheduled: theme.colors.info,
    in_progress: theme.colors.warning,
    completed: theme.colors.success,
    cancelled: theme.colors.danger,
    absent: theme.colors.danger,
  };
  const labels: Record<string, string> = {
    scheduled: "Programado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
    absent: "Ausente",
  };
  const c = colors[status] || theme.colors.textMuted;
  return (
    <View style={[statBadgeStyles.badge, { backgroundColor: c + "18" }]}>
      <Text style={[statBadgeStyles.text, { color: c }]}>{labels[status] || status}</Text>
    </View>
  );
}

const statBadgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: "600" },
});

function FadeInView({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function QuickAction({ theme, icon, label, color, onPress }: any) {
  return (
    <FadeInView>
    <TouchableOpacity style={[qaStyles.card, { backgroundColor: theme.colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[qaStyles.iconBox, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[qaStyles.label, { color: theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
    </FadeInView>
  );
}

const qaStyles = StyleSheet.create({
  card: { width: (width - 56) / 2, borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 32 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
    greeting: { fontSize: 26, fontWeight: "bold", color: t.colors.text },
    dateText: { fontSize: 14, color: t.colors.textSecondary, marginTop: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: { backgroundColor: t.colors.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.surfaceVariant, justifyContent: "center", alignItems: "center" },
    activeSessionCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: t.colors.border },
    sessionIndicator: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
    sessionInfo: { flex: 1 },
    sessionTitle: { fontSize: 13, fontWeight: "700", color: t.colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
    sessionSubtitle: { fontSize: 16, fontWeight: "600", color: t.colors.text, marginTop: 2 },
    sessionDetail: { fontSize: 13, color: t.colors.textSecondary, marginTop: 1 },
    pulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.success + "30", justifyContent: "center", alignItems: "center", marginLeft: 8 },
    pulseDot: { width: 6, height: 6, borderRadius: 3 },
    profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: t.colors.surface, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.dark ? 0.3 : 0.05, shadowRadius: 4, elevation: 2 },
    avatar: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 14 },
    avatarText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 17, fontWeight: "bold", color: t.colors.text },
    profileCompany: { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 8 },
    autoCloseBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, marginBottom: 12, gap: 8 },
    autoCloseText: { fontSize: 13, fontWeight: "500" },
    section: { marginTop: 8, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    seeAll: { fontSize: 14, color: t.colors.primary, fontWeight: "600" },
    emptyCard: { backgroundColor: t.colors.surface, borderRadius: 14, padding: 32, alignItems: "center" },
    emptyText: { fontSize: 14, color: t.colors.textMuted, marginTop: 8 },
    shiftCard: { flexDirection: "row", alignItems: "center", backgroundColor: t.colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.dark ? 0.2 : 0.04, shadowRadius: 3, elevation: 1 },
    shiftTime: { alignItems: "center", marginRight: 14, width: 44 },
    shiftTimeText: { fontSize: 12, fontWeight: "600", color: t.colors.textSecondary },
    shiftTimeLine: { width: 1, height: 16, backgroundColor: t.colors.border, marginVertical: 4 },
    shiftInfo: { flex: 1 },
    shiftName: { fontSize: 15, fontWeight: "600", color: t.colors.text },
    shiftClient: { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
    shiftObs: { fontSize: 12, color: t.colors.textMuted, marginTop: 1 },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  });
}
