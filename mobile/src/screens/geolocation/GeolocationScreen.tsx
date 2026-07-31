import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, ScrollView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import { getCurrentLocation, haversineDistance } from "../../utils/location";
import { startGeofenceMonitoring, stopGeofenceMonitoring, isGeofenceMonitoringActive, onGeofenceAlert, GeofenceAlert } from "../../services/geofenceMonitor";
import api from "../../services/api";

const { width, height } = Dimensions.get("window");

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default || Maps.MapView;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
  } catch {}
}

export default function GeolocationScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [location, setLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [nearestFence, setNearestFence] = useState<{ name: string; distance: number; inside: boolean } | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<GeofenceAlert[]>([]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    loadLocation();
    loadGeofences();
    setMonitoringActive(isGeofenceMonitoringActive());

    const unsub = onGeofenceAlert((alert) => {
      setRecentAlerts((prev) => [alert, ...prev].slice(0, 10));
    });

    return () => {
      unsub();
    };
  }, []);

  const loadLocation = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      setLocation({ lat: loc.latitude, lon: loc.longitude, accuracy: loc.accuracy || 0 });
    } catch {}
    setLoading(false);
  };

  const loadGeofences = async () => {
    try {
      const companyId = useAuthStore.getState().companyId;
      if (!companyId) return;
      const res = await api.get("/geolocation/geofences", { params: { company_id: companyId } });
      setGeofences(res.data || []);
    } catch {}
  };

  useEffect(() => {
    if (!location || geofences.length === 0) return;
    let closest = { name: "", distance: Infinity, inside: false };
    for (const f of geofences) {
      const d = haversineDistance(location.lat, location.lon, f.center_latitude, f.center_longitude);
      if (d < closest.distance) {
        closest = { name: f.name, distance: d, inside: d <= f.radius };
      }
    }
    if (closest.distance < Infinity) setNearestFence(closest);
  }, [location, geofences]);

  const toggleMonitoring = async () => {
    if (monitoringActive) {
      stopGeofenceMonitoring();
      setMonitoringActive(false);
    } else {
      const started = await startGeofenceMonitoring();
      setMonitoringActive(started);
    }
  };

  const centerOnUser = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 300);
    }
  };

  const s = styles(theme);

  const hasMap = MapView && Platform.OS !== "web";

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Geolocalizacion</Text>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={[s.monitorBtn, { backgroundColor: monitoringActive ? theme.colors.success + "15" : theme.colors.surfaceVariant }]}
            onPress={toggleMonitoring}
          >
            <Ionicons name={monitoringActive ? "shield-checkmark" : "shield-outline"} size={18} color={monitoringActive ? theme.colors.success : theme.colors.textMuted} />
            <Text style={[s.monitorBtnText, { color: monitoringActive ? theme.colors.success : theme.colors.textMuted }]}>
              {monitoringActive ? "Monitoreando" : "Monitorear"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadLocation} style={s.refreshBtn}>
            <Ionicons name="refresh" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {hasMap && location ? (
        <View style={s.mapContainer}>
          <MapView
            ref={mapRef}
            style={s.map}
            initialRegion={{
              latitude: location.lat,
              longitude: location.lon,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            <Marker
              coordinate={{ latitude: location.lat, longitude: location.lon }}
              title="Mi ubicacion"
              description={`Precision: ${Math.round(location.accuracy)}m`}
            />
            {geofences.map((f) => (
              <React.Fragment key={f.id}>
                <Circle
                  center={{ latitude: f.center_latitude, longitude: f.center_longitude }}
                  radius={f.radius}
                  fillColor={(f.color || "#3B82F6") + "20"}
                  strokeColor={f.color || "#3B82F6"}
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: f.center_latitude, longitude: f.center_longitude }}
                  title={f.name}
                  description={`Radio: ${f.radius}m`}
                />
              </React.Fragment>
            ))}
          </MapView>
          <TouchableOpacity style={[s.centerBtn, { backgroundColor: theme.colors.surface }]} onPress={centerOnUser}>
            <Ionicons name="locate" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.mapPlaceholder}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons name="map-outline" size={64} color={theme.colors.textMuted} />
              <Text style={[s.mapText, { color: theme.colors.textMuted }]}>Mapa no disponible</Text>
              {location && (
                <Text style={[s.mapCoord, { color: theme.colors.textSecondary }]}>
                  {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      <ScrollView style={s.infoPanel} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : location ? (
          <>
            <View style={[s.infoCard, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <View style={s.infoContent}>
                <Text style={[s.infoLabel, { color: theme.colors.textMuted }]}>Ubicacion Actual</Text>
                <Text style={[s.infoValue, { color: theme.colors.text }]}>
                  {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </Text>
                <Text style={[s.infoSub, { color: theme.colors.textSecondary }]}>Precision: {Math.round(location.accuracy)}m</Text>
              </View>
            </View>

            {nearestFence && (
              <View style={[s.infoCard, { backgroundColor: nearestFence.inside ? theme.colors.success + "10" : theme.colors.danger + "10" }]}>
                <Ionicons name={nearestFence.inside ? "checkmark-circle" : "alert-circle"} size={20} color={nearestFence.inside ? theme.colors.success : theme.colors.danger} />
                <View style={s.infoContent}>
                  <Text style={[s.infoLabel, { color: theme.colors.textMuted }]}>Geocerca Mas Cercana</Text>
                  <Text style={[s.infoValue, { color: theme.colors.text }]}>{nearestFence.name}</Text>
                  <Text style={[s.infoSub, { color: nearestFence.inside ? theme.colors.success : theme.colors.danger }]}>
                    {Math.round(nearestFence.distance)}m — {nearestFence.inside ? "Dentro" : "Fuera"}
                  </Text>
                </View>
              </View>
            )}

            {recentAlerts.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Alertas Recientes</Text>
                {recentAlerts.map((alert, i) => (
                  <View key={i} style={[s.alertCard, { backgroundColor: alert.event === "entry" ? theme.colors.success + "10" : theme.colors.warning + "10", borderLeftColor: alert.event === "entry" ? theme.colors.success : theme.colors.warning }]}>
                    <Ionicons name={alert.event === "entry" ? "enter-outline" : "exit-outline"} size={18} color={alert.event === "entry" ? theme.colors.success : theme.colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.alertText, { color: theme.colors.text }]}>
                        {alert.event === "entry" ? "Entrada" : "Salida"}: {alert.fence.name}
                      </Text>
                      <Text style={[s.alertTime, { color: theme.colors.textMuted }]}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Geocercas Configuradas ({geofences.length})</Text>
            {geofences.length === 0 ? (
              <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>No hay geocercas configuradas</Text>
            ) : (
              geofences.map((f) => {
                const d = haversineDistance(location.lat, location.lon, f.center_latitude, f.center_longitude);
                const inside = d <= f.radius;
                return (
                  <View key={f.id} style={[s.fenceCard, { backgroundColor: theme.colors.surface, borderLeftColor: inside ? theme.colors.success : theme.colors.danger }]}>
                    <View style={s.fenceHeader}>
                      <Text style={[s.fenceName, { color: theme.colors.text }]}>{f.name}</Text>
                      <View style={[s.fenceBadge, { backgroundColor: inside ? theme.colors.success + "15" : theme.colors.danger + "15" }]}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: inside ? theme.colors.success : theme.colors.danger }}>
                          {inside ? "DENTRO" : "FUERA"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.fenceDist, { color: theme.colors.textSecondary }]}>
                      {Math.round(d)}m de distancia — Radio: {f.radius}m
                    </Text>
                    {f.description && <Text style={[s.fenceDesc, { color: theme.colors.textMuted }]}>{f.description}</Text>}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <Text style={[s.emptyText, { color: theme.colors.textMuted, textAlign: "center", marginTop: 20 }]}>
            No se pudo obtener la ubicacion. Verifique los permisos.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    monitorBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    monitorBtnText: { fontSize: 13, fontWeight: "600" },
    refreshBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    mapContainer: { height: height * 0.35, marginHorizontal: 20, borderRadius: 16, overflow: "hidden", marginBottom: 16 },
    map: { flex: 1 },
    centerBtn: { position: "absolute", bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    mapPlaceholder: { height: height * 0.3, backgroundColor: t.colors.surfaceVariant, justifyContent: "center", alignItems: "center", marginHorizontal: 20, borderRadius: 16, marginBottom: 16 },
    mapText: { fontSize: 14, marginTop: 8 },
    mapCoord: { fontSize: 12, marginTop: 4 },
    infoPanel: { flex: 1, paddingHorizontal: 20 },
    infoCard: { flexDirection: "row", borderRadius: 14, padding: 16, marginBottom: 12, gap: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 12, marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: "600" },
    infoSub: { fontSize: 13, marginTop: 2 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, marginTop: 4 },
    emptyText: { fontSize: 14, marginBottom: 12 },
    alertCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 8, gap: 10, borderLeftWidth: 4 },
    alertText: { fontSize: 14, fontWeight: "500" },
    alertTime: { fontSize: 12, marginTop: 2 },
    fenceCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4 },
    fenceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    fenceName: { fontSize: 15, fontWeight: "600" },
    fenceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    fenceDist: { fontSize: 13 },
    fenceDesc: { fontSize: 12, marginTop: 4 },
  });
}
