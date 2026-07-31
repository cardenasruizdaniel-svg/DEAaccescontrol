import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  ActivityIndicator, Animated, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useOfflineStore } from "../../stores/offlineStore";
import api from "../../services/api";
import { toLocalDateStr } from "../../utils/dateUtils";
import { getCurrentLocation, isInsideGeofence } from "../../utils/location";
import { detectMockLocation, getDeviceInfo } from "../../utils/device";
import * as Battery from "expo-battery";
import { startBackgroundTracking, stopBackgroundTracking } from "../../services/locationTracking";
import { startGeofenceMonitoring, stopGeofenceMonitoring } from "../../services/geofenceMonitor";

let Camera: any = null;
let CameraType: any = null;
let ImagePicker: any = null;
if (Platform.OS !== "web") {
  try { Camera = require("expo-camera").Camera; CameraType = require("expo-camera").CameraType; } catch {}
  try { ImagePicker = require("expo-image-picker"); } catch {}
}

type Status = "idle" | "camera" | "verifying" | "result";

function showAlert(title: string, message: string) {
  if (Platform.OS === "web") { window.alert(`${title}\n${message}`); } else { Alert.alert(title, message); }
}

export default function AccessScreen({ navigation }: any) {
  const { employeeId } = useAuthStore();
  const { theme } = useTheme();
  const { addRecord, isOnline } = useOfflineStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [operation, setOperation] = useState<"entry" | "exit" | null>(null);
  const [result, setResult] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<"outside" | "inside">("outside");
  const [lastRecord, setLastRecord] = useState<any>(null);
  const cameraRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [canAssignGeo, setCanAssignGeo] = useState(false);
  const [geoClientId, setGeoClientId] = useState<string | null>(null);
  const [geoClientName, setGeoClientName] = useState<string>("");
  const [needsGeo, setNeedsGeo] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoAssigned, setGeoAssigned] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" && Camera) {
      Camera.requestCameraPermissionsAsync().then((res: any) => setHasPermission(res.granted));
    } else {
      setHasPermission(false);
    }
    loadStatus();
    loadGeoStatus();
  }, []);

  useEffect(() => {
    if (status === "verifying") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status]);

  const loadStatus = async () => {
    if (!employeeId) return;
    try {
      const res = await api.get(`/access/history/${employeeId}`, { params: { start_date: toLocalDateStr() } });
      const records = res.data || [];
      if (records.length > 0) {
        const last = records[records.length - 1];
        setLastRecord(last);
        setCurrentStatus(last.record_type === "entry" ? "inside" : "outside");
      }
    } catch {}
  };

  const loadGeoStatus = async () => {
    try {
      const empRes = await api.get("/mobile/me/employee");
      const canGeo = empRes.data?.can_assign_georeference ?? false;
      setCanAssignGeo(canGeo);
      if (!canGeo) return;

      const today = toLocalDateStr();
      const shiftRes = await api.get("/mobile/me/shifts", { params: { start_date: today, end_date: today } });
      const shifts = Array.isArray(shiftRes.data) ? shiftRes.data : [];
      const activeShift = shifts.find((s: any) => s.client_id && s.status !== "completed" && s.status !== "cancelled");
      if (!activeShift?.client_id) return;

      setGeoClientId(activeShift.client_id);

      const clientRes = await api.get(`/mobile/clients/${activeShift.client_id}`);
      const client = clientRes.data;
      setGeoClientName(client.name || "");
      if (client.latitude == null || client.longitude == null) {
        setNeedsGeo(true);
      }
    } catch {}
  };

  const assignGeoreference = async () => {
    if (!geoClientId) return;
    setGeoLoading(true);
    try {
      const location = await getCurrentLocation();
      await api.post(`/mobile/clients/${geoClientId}/assign-georeference`, {
        latitude: location.latitude,
        longitude: location.longitude,
        geofence_radius: 100,
      });
      setNeedsGeo(false);
      setGeoAssigned(true);
      showAlert("Éxito", "Georreferencia asignada al cliente correctamente");
    } catch (e: any) {
      showAlert("Error", e?.response?.data?.detail || "No se pudo asignar la georreferencia");
    }
    setGeoLoading(false);
  };

  const startOperation = (op: "entry" | "exit") => {
    if (!hasPermission) {
      Alert.alert("Permiso requerido", "Se necesita acceso a la cámara para verificación biométrica");
      return;
    }
    setOperation(op);
    setStatus("camera");
  };

  const takePictureAndVerify = async () => {
    if (!cameraRef.current || !operation || !employeeId) return;
    setStatus("verifying");

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      const location = await getCurrentLocation();
      const mockCheck = await detectMockLocation();
      const deviceInfo = await getDeviceInfo();

      if (mockCheck.isMock) {
        Alert.alert("Ubicación Falsa Detectada", "Se detectó uso de ubicación simulada. La operación ha sido bloqueada.");
        setStatus("idle");
        return;
      }

      const verifyRes = await api.post("/facial-recognition/verify", {
        employee_id: employeeId,
        photo_base64: photo.base64,
      });

      const faceVerified = verifyRes.data?.verified ?? false;

      let batteryLevel = 100;
      try {
        batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
      } catch {}

      const accessData = {
        employee_id: employeeId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        photo_base64: photo.base64,
        device_id: deviceInfo.device_id,
        device_model: deviceInfo.device_model,
        device_os: deviceInfo.device_os,
        battery_level: batteryLevel,
        connection_type: isOnline ? "online" : "offline",
        is_mock_location: mockCheck.isMock,
      };

      let apiResult;
      try {
        if (operation === "entry") {
          apiResult = await api.post("/access/entry", accessData);
        } else {
          apiResult = await api.post("/access/exit", { ...accessData, observations: "" });
        }
      } catch (apiError) {
        if (!isOnline) {
          await addRecord({
            type: operation,
            data: accessData,
            timestamp: new Date().toISOString(),
          });
          apiResult = { data: { allowed: true, offline: true, message: "Registro guardado offline" } };
        } else {
          throw apiError;
        }
      }

      setResult({
        faceVerified,
        insideGeofence: apiResult.data?.inside_geofence ?? true,
        allowed: apiResult.data?.allowed ?? true,
        offline: apiResult.data?.offline ?? false,
        message: apiResult.data?.message || (operation === "entry" ? "Entrada registrada" : "Salida registrada"),
      });
      setStatus("result");
      setCurrentStatus(operation === "entry" ? "inside" : "outside");
      if (operation === "entry") {
        startBackgroundTracking(employeeId).catch(() => {});
        startGeofenceMonitoring().catch(() => {});
      } else {
        stopBackgroundTracking().catch(() => {});
        stopGeofenceMonitoring();
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || e?.message || "No se pudo completar la operación");
      setStatus("idle");
    }
  };

  const resetToIdle = () => {
    setStatus("idle");
    setOperation(null);
    setResult(null);
    loadStatus();
  };

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.title}>Control de Acceso</Text>
        <Text style={s.subtitle}>DLA Access Enterprise</Text>
      </View>

      {canAssignGeo && needsGeo && !geoAssigned && (
        <TouchableOpacity
          style={[s.geoCard, { borderColor: theme.colors.warning }]}
          onPress={assignGeoreference}
          disabled={geoLoading}
          activeOpacity={0.7}
        >
          <View style={[s.geoIcon, { backgroundColor: theme.colors.warning + "20" }]}>
            {geoLoading ? (
              <ActivityIndicator size="small" color={theme.colors.warning} />
            ) : (
              <Ionicons name="location-outline" size={24} color={theme.colors.warning} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.geoTitle, { color: theme.colors.text }]}>Asignar Georreferencia</Text>
            <Text style={[s.geoSub, { color: theme.colors.textSecondary }]}>
              {geoClientName ? `${geoClientName} no tiene ubicación` : "Cliente sin ubicación"} — Tocar para tomar GPS
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}

      {canAssignGeo && geoAssigned && (
        <View style={[s.geoCard, { borderColor: theme.colors.success }]}>
          <View style={[s.geoIcon, { backgroundColor: theme.colors.success + "20" }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          </View>
          <Text style={[s.geoTitle, { color: theme.colors.success }]}>Georreferencia Asignada</Text>
        </View>
      )}

      <View style={[s.statusCard, { backgroundColor: currentStatus === "inside" ? theme.colors.success + "12" : theme.colors.surface }]}>
        <View style={[s.statusDot, { backgroundColor: currentStatus === "inside" ? theme.colors.success : theme.colors.danger }]} />
        <View style={s.statusInfo}>
          <Text style={[s.statusLabel, { color: theme.colors.textSecondary }]}>Estado Actual</Text>
          <Text style={[s.statusValue, { color: currentStatus === "inside" ? theme.colors.success : theme.colors.danger }]}>
            {currentStatus === "inside" ? "Dentro del turno" : "Fuera de turno"}
          </Text>
        </View>
      </View>

      {status === "idle" && (
        <View style={s.actionSection}>
          <TouchableOpacity
            style={[s.actionCard, { backgroundColor: theme.colors.success + "10", borderColor: theme.colors.success }]}
            onPress={() => startOperation("entry")}
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: theme.colors.success + "20" }]}>
              <Ionicons name="log-in-outline" size={28} color={theme.colors.success} />
            </View>
            <Text style={[s.actionTitle, { color: theme.colors.text }]}>Registrar Entrada</Text>
            <Text style={[s.actionSub, { color: theme.colors.textSecondary }]}>Verificación facial + GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard, { backgroundColor: theme.colors.danger + "10", borderColor: theme.colors.danger }]}
            onPress={() => startOperation("exit")}
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: theme.colors.danger + "20" }]}>
              <Ionicons name="log-out-outline" size={28} color={theme.colors.danger} />
            </View>
            <Text style={[s.actionTitle, { color: theme.colors.text }]}>Registrar Salida</Text>
            <Text style={[s.actionSub, { color: theme.colors.textSecondary }]}>Verificación facial + GPS</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "camera" && Platform.OS !== "web" && Camera && (
        <View style={s.cameraSection}>
          <Camera style={s.camera} ref={cameraRef} type={CameraType.front}>
            <View style={s.cameraOverlay}>
              <View style={s.faceGuide} />
            </View>
          </Camera>
          <View style={s.cameraActions}>
            <TouchableOpacity style={[s.captureBtn, { backgroundColor: operation === "entry" ? theme.colors.success : theme.colors.danger }]} onPress={takePictureAndVerify}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={s.captureBtnText}>{operation === "entry" ? "Capturar y Entrar" : "Capturar y Salir"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setStatus("idle")}>
              <Text style={[s.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {status === "verifying" && (
        <View style={s.verifyingSection}>
          <Animated.View style={[s.verifyingIcon, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="shield-checkmark-outline" size={48} color={theme.colors.primary} />
          </Animated.View>
          <Text style={[s.verifyingText, { color: theme.colors.text }]}>Verificando identidad...</Text>
          <Text style={[s.verifyingSub, { color: theme.colors.textSecondary }]}>Comparando con fotografía registrada</Text>
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
        </View>
      )}

      {status === "result" && result && (
        <View style={s.resultSection}>
          <View style={[s.resultIcon, { backgroundColor: result.allowed ? theme.colors.success + "15" : theme.colors.danger + "15" }]}>
            <Ionicons
              name={result.allowed ? "checkmark-circle" : "close-circle"}
              size={56}
              color={result.allowed ? theme.colors.success : theme.colors.danger}
            />
          </View>
          <Text style={[s.resultTitle, { color: theme.colors.text }]}>
            {result.allowed ? "Operación Exitosa" : "Acceso Denegado"}
          </Text>
          <Text style={[s.resultMessage, { color: theme.colors.textSecondary }]}>{result.message}</Text>

          <View style={s.resultChecks}>
            <ResultCheck icon={result.faceVerified ? "checkmark" : "close"} label="Identidad verificada" passed={result.faceVerified} theme={theme} />
            <ResultCheck icon={result.insideGeofence ? "checkmark" : "close"} label="Dentro de geocerca" passed={result.insideGeofence} theme={theme} />
            {result.offline && <ResultCheck icon="cloud-offline" label="Registro offline" passed={true} theme={theme} />}
          </View>

          <TouchableOpacity style={[s.doneBtn, { backgroundColor: theme.colors.primary }]} onPress={resetToIdle}>
            <Text style={s.doneBtnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      )}

      {lastRecord && (
        <View style={[s.historyCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.historyTitle, { color: theme.colors.text }]}>Último Registro</Text>
          <Text style={[s.historyDetail, { color: theme.colors.textSecondary }]}>
            {lastRecord.record_type === "entry" ? "Entrada" : "Salida"}: {new Date(lastRecord.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ResultCheck({ icon, label, passed, theme }: any) {
  return (
    <View style={[checkStyles.row, { opacity: passed ? 1 : 0.6 }]}>
      <Ionicons name={icon === "checkmark" ? "checkmark-circle" : icon === "close" ? "close-circle" : "cloud-offline-outline"} size={20} color={passed ? theme.colors.success : theme.colors.danger} />
      <Text style={[checkStyles.label, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

const checkStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "500" },
});

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: "bold", color: t.colors.text },
    subtitle: { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
    geoCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 16, borderRadius: 14, padding: 16, borderWidth: 1.5, backgroundColor: t.colors.surface, gap: 12 },
    geoIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    geoTitle: { fontSize: 15, fontWeight: "bold" },
    geoSub: { fontSize: 12, marginTop: 2 },
    statusCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 20 },
    statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
    statusInfo: { flex: 1 },
    statusLabel: { fontSize: 12, marginBottom: 2 },
    statusValue: { fontSize: 17, fontWeight: "bold" },
    actionSection: { paddingHorizontal: 20, gap: 12 },
    actionCard: { borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1 },
    actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 12 },
    actionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
    actionSub: { fontSize: 13 },
    cameraSection: { marginHorizontal: 20 },
    camera: { height: 300, borderRadius: 16, overflow: "hidden" },
    cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
    faceGuide: { width: 180, height: 240, borderRadius: 90, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", borderStyle: "dashed" },
    cameraActions: { marginTop: 16, gap: 10 },
    captureBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
    captureBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    cancelBtn: { height: 44, justifyContent: "center", alignItems: "center" },
    cancelBtnText: { fontSize: 15, fontWeight: "500" },
    verifyingSection: { alignItems: "center", paddingVertical: 40 },
    verifyingIcon: { marginBottom: 16 },
    verifyingText: { fontSize: 18, fontWeight: "bold" },
    verifyingSub: { fontSize: 14, marginTop: 4 },
    resultSection: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 20 },
    resultIcon: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", marginBottom: 16 },
    resultTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
    resultMessage: { fontSize: 14, textAlign: "center", marginBottom: 20 },
    resultChecks: { alignSelf: "stretch", marginBottom: 24 },
    doneBtn: { height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", alignSelf: "stretch" },
    doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    historyCard: { marginHorizontal: 20, borderRadius: 14, padding: 16, marginTop: 12 },
    historyTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
    historyDetail: { fontSize: 13 },
  });
}
