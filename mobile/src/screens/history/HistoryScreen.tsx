import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import OfflineBanner from "../../components/OfflineBanner";
import api from "../../services/api";
import { toLocalDateStr } from "../../utils/dateUtils";

export default function HistoryScreen({ navigation }: any) {
  const { employeeId } = useAuthStore();
  const { theme } = useTheme();
  const [records, setRecords] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "entry" | "exit">("all");

  const loadData = async () => {
    try {
      const res = await api.get("/mobile/me/access-history", {
        params: { start_date: getMonthStart(), end_date: getMonthEnd(), page_size: 100 },
      });
      setRecords(res.data.items || []);
    } catch {}
  };

  useEffect(() => { loadData(); }, [employeeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = filter === "all" ? records : records.filter((r) => r.record_type === filter);
  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Historial</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      <View style={s.filters}>
        {(["all", "entry", "exit"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && { backgroundColor: theme.colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, { color: filter === f ? "#fff" : theme.colors.textSecondary }]}>
              {f === "all" ? "Todos" : f === "entry" ? "Entradas" : "Salidas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="time-outline" size={40} color={theme.colors.textMuted} />
          <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>No hay registros</Text>
        </View>
      ) : (
        filtered.map((record, idx) => (
          <View key={record.id || idx} style={[s.recordCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[s.recordIcon, { backgroundColor: record.record_type === "entry" ? theme.colors.success + "15" : theme.colors.danger + "15" }]}>
              <Ionicons name={record.record_type === "entry" ? "log-in" : "log-out"} size={18} color={record.record_type === "entry" ? theme.colors.success : theme.colors.danger} />
            </View>
            <View style={s.recordInfo}>
              <Text style={[s.recordType, { color: theme.colors.text }]}>
                {record.record_type === "entry" ? "Entrada" : "Salida"}
              </Text>
              <Text style={[s.recordTime, { color: theme.colors.textSecondary }]}>
                {new Date(record.timestamp).toLocaleString()}
              </Text>
              <View style={s.recordBadges}>
                {record.face_verified !== undefined && (
                  <Badge label={record.face_verified ? "Facial OK" : "Sin facial"} color={record.face_verified ? theme.colors.success : theme.colors.warning} theme={theme} />
                )}
                {record.inside_geofence !== undefined && (
                  <Badge label={record.inside_geofence ? "En geocerca" : "Fuera"} color={record.inside_geofence ? theme.colors.success : theme.colors.warning} theme={theme} />
                )}
                {record.auto_closed && (
                  <Badge label="Auto-cierre" color={theme.colors.info} theme={theme} />
                )}
                {record.is_late_arrival && (
                  <Badge label="Llegada tarde" color={theme.colors.danger} theme={theme} />
                )}
                {record.is_early_departure && (
                  <Badge label="Salida temprano" color={theme.colors.warning} theme={theme} />
                )}
                {record.worked_hours && (
                  <Badge label={`${record.worked_hours.toFixed(1)}h`} color={theme.colors.primary} theme={theme} />
                )}
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Badge({ label, color, theme }: any) {
  return (
    <View style={[badgeStyles.badge, { backgroundColor: color + "18" }]}>
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6 },
  text: { fontSize: 11, fontWeight: "600" },
});

function getMonthStart() {
  const d = new Date();
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

function getMonthEnd() {
  const d = new Date();
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    filters: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: t.colors.surfaceVariant },
    filterText: { fontSize: 13, fontWeight: "600" },
    emptyContainer: { alignItems: "center", paddingTop: 60 },
    emptyText: { fontSize: 14, marginTop: 12 },
    recordCard: { flexDirection: "row", marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 10 },
    recordIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
    recordInfo: { flex: 1 },
    recordType: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
    recordTime: { fontSize: 13, marginBottom: 6 },
    recordBadges: { flexDirection: "row", flexWrap: "wrap" },
  });
}
