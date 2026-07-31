import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import OfflineBanner from "../../components/OfflineBanner";
import { Shift } from "../../types";
import api from "../../services/api";

export default function ShiftDetailScreen({ route, navigation }: any) {
  const { shift, showActions }: { shift: Shift; showActions?: boolean } = route.params;
  const { theme } = useTheme();
  const [clientInfo, setClientInfo] = useState<{ latitude?: number; longitude?: number; address?: string; city?: string } | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);

  useEffect(() => {
    if (shift.client_id) {
      setLoadingClient(true);
      api.get(`/mobile/clients/${shift.client_id}`).then((res) => {
        setClientInfo(res.data);
      }).catch(() => {}).finally(() => setLoadingClient(false));
    }
  }, [shift.client_id]);

  const openNavigation = () => {
    if (clientInfo?.latitude && clientInfo?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${clientInfo.latitude},${clientInfo.longitude}`;
      Linking.openURL(url).catch(() => {});
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shift.client_name || shift.name)}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleStartShift = () => {
    navigation.navigate("Turno", { shiftId: shift.id });
  };

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Detalle del Turno</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      <View style={[s.card, { borderLeftColor: shift.color || theme.colors.primary, borderLeftWidth: 4 }]}>        
        <Text style={s.shiftName}>{shift.name}</Text>
        <View style={s.timeRow}>
          <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
          <Text style={s.timeText}>{shift.start_time} - {shift.end_time}</Text>
        </View>
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
          <Text style={s.dateText}>{formatFullDate(shift.shift_date)}</Text>
        </View>
      </View>

      <View style={s.card}>
        <InfoRow theme={theme} icon="business-outline" label="Cliente" value={shift.client_name || "No asignado"} />
        {clientInfo?.address && <InfoRow theme={theme} icon="location-outline" label="Dirección" value={clientInfo.address} />}
        {clientInfo?.city && <InfoRow theme={theme} icon="city-outline" label="Ciudad" value={clientInfo.city} />}
        {loadingClient && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 8 }} />}
        <InfoRow theme={theme} icon="person-outline" label="Persona" value={shift.persona_name || "No asignado"} />
        <InfoRow theme={theme} icon="layers-outline" label="Prioridad" value={shift.priority} />
        <InfoRow theme={theme} icon="pause-circle-outline" label="Descanso" value={`${shift.break_minutes} min`} />
        {shift.observations && <InfoRow theme={theme} icon="document-text-outline" label="Observaciones" value={shift.observations} />}
        {shift.notes && <InfoRow theme={theme} icon="chatbubble-outline" label="Notas" value={shift.notes} />}
      </View>

      <View style={s.actions}>
        {showActions && shift.status === "scheduled" && (
          <TouchableOpacity
            style={[s.startButton, { backgroundColor: theme.colors.success }]}
            onPress={handleStartShift}
          >
            <Ionicons name="play-circle-outline" size={20} color="#fff" />
            <Text style={s.buttonText}>Iniciar Turno</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.navButton} onPress={openNavigation}>
          <Ionicons name="navigate-outline" size={20} color="#fff" />
          <Text style={s.buttonText}>Navegar al Sitio</Text>
          {clientInfo?.latitude && clientInfo?.longitude && (
            <Text style={s.coordsText}>GPS</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ theme, icon, label, value }: any) {
  return (
    <View style={[infoStyles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <View style={infoStyles.content}>
        <Text style={[infoStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: theme.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  content: { flex: 1 },
  label: { fontSize: 12, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: "500" },
});

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    card: { backgroundColor: t.colors.surface, marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
    shiftName: { fontSize: 20, fontWeight: "bold", color: t.colors.text, marginBottom: 12 },
    timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    timeText: { fontSize: 16, fontWeight: "600", color: t.colors.text },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dateText: { fontSize: 14, color: t.colors.textSecondary },
    actions: { marginHorizontal: 20, gap: 12, marginTop: 8 },
    startButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 12 },
    navButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, backgroundColor: t.colors.info, borderRadius: 12 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    coordsText: { fontSize: 10, color: "#fff", backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: "700" },
  });
}
