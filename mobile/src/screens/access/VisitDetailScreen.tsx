import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import OfflineBanner from "../../components/OfflineBanner";
import { getCurrentLocation, isInsideGeofence, haversineDistance } from "../../utils/location";
import api from "../../services/api";
import { Shift } from "../../types";

export default function VisitDetailScreen({ route, navigation }: any) {
  const { shift }: { shift: Shift } = route.params;
  const { theme } = useTheme();
  const { employeeId } = useAuthStore();
  const [clientLocation, setClientLocation] = useState<{ lat: number; lon: number; radius: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClientLocation();
    loadCurrentLocation();
  }, []);

  const loadClientLocation = async () => {
    if (!shift.client_id) return;
    try {
      const res = await api.get(`/clients/${shift.client_id}`);
      const { latitude, longitude, geofence_radius } = res.data;
      if (latitude && longitude) {
        setClientLocation({ lat: latitude, lon: longitude, radius: geofence_radius || 50 });
      }
    } catch {}
  };

  const loadCurrentLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setCurrentLocation({ lat: loc.latitude, lon: loc.longitude });
      if (clientLocation) {
        const dist = haversineDistance(loc.latitude, loc.longitude, clientLocation.lat, clientLocation.lon);
        setDistance(dist);
      }
    } catch {}
  };

  const openNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${clientLocation?.lat || ""},${clientLocation?.lon || ""}`;
    Linking.openURL(url).catch(() => {});
  };

  const registerEntry = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      await api.post("/access/entry", {
        employee_id: employeeId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        shift_id: shift.id,
        client_id: shift.client_id,
      });
      Alert.alert("Éxito", "Entrada registrada correctamente");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "No se pudo registrar entrada");
    }
    setLoading(false);
  };

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Detalle de Visita</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      <View style={[s.card, { borderLeftColor: shift.color || theme.colors.primary, borderLeftWidth: 4 }]}>        
        <Text style={s.shiftName}>{shift.name}</Text>
        <View style={s.infoRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
          <Text style={s.infoText}>{shift.start_time} - {shift.end_time}</Text>
        </View>
      </View>

      <View style={s.card}>
        <InfoItem theme={theme} icon="business" label="Cliente" value={shift.client_name || "N/A"} />
        <InfoItem theme={theme} icon="person" label="Persona" value={shift.persona_name || "N/A"} />
        <InfoItem theme={theme} icon="document-text" label="Observaciones" value={shift.observations || "Sin observaciones"} />
        {distance !== null && (
          <InfoItem
            theme={theme}
            icon="location"
            label="Distancia al destino"
            value={`${Math.round(distance)}m ${clientLocation ? `(radio: ${clientLocation.radius}m)` : ""}`}
            highlight={clientLocation ? distance <= clientLocation.radius : undefined}
          />
        )}
      </View>

      {clientLocation && (
        <View style={s.card}>
          <Text style={[s.cardTitle, { color: theme.colors.text }]}>Ubicación</Text>
          <Text style={[s.cardSub, { color: theme.colors.textSecondary }]}>
            Lat: {clientLocation.lat.toFixed(6)}, Lon: {clientLocation.lon.toFixed(6)}
          </Text>
          {currentLocation && (
            <Text style={[s.cardSub, { color: theme.colors.textSecondary }]}>
              Actual: {currentLocation.lat.toFixed(6)}, {currentLocation.lon.toFixed(6)}
            </Text>
          )}
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={[s.navButton, { backgroundColor: theme.colors.info }]} onPress={openNavigation}>
          <Ionicons name="navigate-outline" size={20} color="#fff" />
          <Text style={s.btnText}>Navegar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.entryButton]} onPress={registerEntry} disabled={loading}>
          {loading ? (
            <Ionicons name="hourglass-outline" size={20} color="#fff" />
          ) : (
            <Ionicons name="finger-print-outline" size={20} color="#fff" />
          )}
          <Text style={s.btnText}>{loading ? "Procesando..." : "Registrar Entrada"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoItem({ theme, icon, label, value, highlight }: any) {
  const color = highlight === true ? theme.colors.success : highlight === false ? theme.colors.danger : theme.colors.text;
  return (
    <View style={[itemStyles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
      <View style={itemStyles.content}>
        <Text style={[itemStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text style={[itemStyles.value, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  content: { flex: 1 },
  label: { fontSize: 12, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: "500" },
});

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    card: { backgroundColor: t.colors.surface, marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
    cardSub: { fontSize: 13, marginBottom: 4 },
    shiftName: { fontSize: 20, fontWeight: "bold", color: t.colors.text, marginBottom: 8 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    infoText: { fontSize: 15, color: t.colors.textSecondary },
    actions: { marginHorizontal: 20, gap: 12, marginTop: 8 },
    navButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 12 },
    entryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, backgroundColor: t.colors.success, borderRadius: 12 },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  });
}
