import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  ActivityIndicator, Animated, Platform, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useOfflineStore } from "../../stores/offlineStore";
import OfflineBanner from "../../components/OfflineBanner";
import api from "../../services/api";
import { getCurrentLocation } from "../../utils/location";
import { detectMockLocation, getDeviceInfo } from "../../utils/device";
import * as Battery from "expo-battery";

let Camera: any = null;
let CameraType: any = null;
if (Platform.OS !== "web") {
  try { Camera = require("expo-camera").Camera; CameraType = require("expo-camera").CameraType; } catch {}
}

const { width } = Dimensions.get("window");

type ScreenState = "loading" | "idle" | "camera_start" | "camera_end" | "verifying" | "result";

interface ActiveShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  client_name: string | null;
  client_id: string | null;
  shift_date: string;
  color: string;
  observations: string | null;
}

interface SessionInfo {
  entry_time: string | null;
  inside_geofence: boolean | null;
  face_verified: boolean | null;
  entry_record_id: string | null;
}

interface TodayShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  color: string;
  client_name: string | null;
  client_id: string | null;
  shift_date: string;
  observations?: string | null;
}

export default function ShiftSessionScreen({ navigation, route }: any) {
  const { employeeId } = useAuthStore();
  const { theme } = useTheme();
  const { isOnline } = useOfflineStore();

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ScreenState>("loading");
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [todayShifts, setTodayShifts] = useState<TodayShift[]>([]);
  const [nextShift, setNextShift] = useState<TodayShift | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [remaining, setRemaining] = useState("00:00:00");
  const [warningShown, setWarningShown] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSession();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (!loading) loadSession();
    });
    return unsub;
  }, [navigation, loading]);

  useEffect(() => {
    if (state === "verifying") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [state]);

  const loadSession = async () => {
    if (!employeeId) return;

    const preSelectId = route?.params?.shiftId;
    if (preSelectId) {
      try {
        const dashRes = await api.get("/mobile/me/dashboard");
        const dash = dashRes.data;
        setTodayShifts(dash.today_shifts || []);
        setEmployeeName(dash.employee_name || "");

        const targetShift = (dash.today_shifts || []).find((s: any) => s.id === preSelectId);
        if (targetShift) {
          setNextShift(targetShift);
          setState("idle");
          setLoading(false);
          setTimeout(() => handleStartVisit(targetShift), 400);
          return;
        }
      } catch {}
    }

    try {
      const res = await api.get("/mobile/me/active-session");
      const d = res.data;
      if (d.shift) setActiveShift(d.shift);
      setSession(d.session || null);
      setTodayShifts(d.today_shifts || []);
      setNextShift(d.next_shift || null);
      setState("idle");

      if (d.active && d.session?.entry_time) {
        startTimer(d.shift, d.session.entry_time);
      }
    } catch {
      setState("idle");
    }
    setLoading(false);
  };

  const startTimer = (shift: ActiveShift, entryTime: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const entryDate = new Date(entryTime);
    timerRef.current = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, (now.getTime() - entryDate.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = Math.floor(diff % 60);
      setElapsed(`${pad(h)}:${pad(m)}:${pad(s)}`);

      if (shift) {
        const [eh, em] = shift.end_time.split(":").map(Number);
        const shiftDate = new Date(shift.shift_date + "T12:00:00");
        const endDate = new Date(shiftDate);
        endDate.setHours(eh, em, 0, 0);
        const rem = Math.max(0, (endDate.getTime() - now.getTime()) / 1000);
        const rh = Math.floor(rem / 3600);
        const rm = Math.floor((rem % 3600) / 60);
        const rs = Math.floor(rem % 60);
        setRemaining(`${pad(rh)}:${pad(rm)}:${pad(rs)}`);

        if (rem <= 600 && rem > 0 && !warningShown) {
          setWarningShown(true);
          if (Platform.OS !== "web") {
            try {
              const Notifications = require("expo-notifications");
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "Turno por finalizar",
                  body: `Su turno "${shift.name}" termina en ${Math.ceil(rem / 60)} minutos`,
                  data: { type: "shift_warning" },
                },
                trigger: null,
              });
            } catch {}
          }
        }
      }
    }, 1000);
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

  const handleStartVisit = async (shift: TodayShift) => {
    if (Platform.OS === "web" || !Camera) {
      try {
        const location = await getCurrentLocation();
        const deviceInfo = await getDeviceInfo();
        let batteryLevel = 100;
        try { batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100); } catch {}

        const res = await api.post("/mobile/me/start-visit", {
          shift_id: shift.id,
          latitude: location.latitude,
          longitude: location.longitude,
          device_id: deviceInfo.device_id,
          device_model: deviceInfo.device_model,
          device_os: deviceInfo.device_os,
          battery_level: batteryLevel,
          connection_type: isOnline ? "online" : "offline",
          is_mock_location: false,
        });

        setResult({ type: "start", data: res.data });
        setState("result");
        setActiveShift(shift as ActiveShift);
        startTimer(shift as ActiveShift, new Date().toISOString());
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.detail || "No se pudo iniciar la visita");
      }
      return;
    }

    setActiveShift(shift as ActiveShift);
    setState("camera_start");
  };

  const handleEndVisit = async () => {
    if (!activeShift) return;

    const [eh, em] = activeShift.end_time.split(":").map(Number);
    const shiftDate = new Date(activeShift.shift_date + "T12:00:00");
    const endDate = new Date(shiftDate);
    endDate.setHours(eh, em, 0, 0);
    const now = new Date();
    const isEarly = now < new Date(endDate.getTime() - 5 * 60 * 1000);

    if (isEarly) {
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          "Salida Anticipada",
          `Aún faltan ${remaining} para finalizar el turno.\n¿Desea cerrar el turno antes de tiempo?`,
          [
            { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
            { text: "Cerrar Turno", onPress: () => resolve(true), style: "destructive" },
          ]
        );
      });
      if (!confirmed) return;
    }

    if (Platform.OS === "web" || !Camera) {
      try {
        const location = await getCurrentLocation();
        const res = await api.post("/mobile/me/end-visit", {
          shift_id: activeShift.id,
          latitude: location.latitude,
          longitude: location.longitude,
          observations: "",
        });

        setResult({ type: "end", data: res.data });
        setState("result");
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveShift(null);
        setSession(null);
        setElapsed("00:00:00");
        setRemaining("00:00:00");
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.detail || "No se pudo cerrar la visita");
      }
      return;
    }
    setState("camera_end");
  };

  const takePictureAndProcess = async () => {
    if (!cameraRef.current || !activeShift) return;
    setState("verifying");
    setProcessing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      const location = await getCurrentLocation();
      const mockCheck = await detectMockLocation();
      const deviceInfo = await getDeviceInfo();

      if (mockCheck.isMock) {
        Alert.alert("Ubicacion Falsa Detectada", "Se detecto ubicacion simulada. Operacion bloqueada.");
        setState("idle");
        setProcessing(false);
        return;
      }

      let batteryLevel = 100;
      try { batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100); } catch {}

      const baseData = {
        latitude: location.latitude,
        longitude: location.longitude,
        photo_base64: photo.base64,
        device_id: deviceInfo.device_id,
        device_model: deviceInfo.device_model,
        device_os: deviceInfo.device_os,
        battery_level: batteryLevel,
        connection_type: isOnline ? "online" : "offline",
        is_mock_location: mockCheck.isMock,
      };

      let res;
      if (state === "camera_start") {
        res = await api.post("/mobile/me/start-visit", {
          ...baseData,
          shift_id: activeShift.id,
        });
        setResult({ type: "start", data: res.data });
        startTimer(activeShift, new Date().toISOString());
      } else {
        res = await api.post("/mobile/me/end-visit", {
          ...baseData,
          shift_id: activeShift.id,
          observations: "",
        });
        setResult({ type: "end", data: res.data });
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveShift(null);
        setSession(null);
        setElapsed("00:00:00");
        setRemaining("00:00:00");
      }

      setState("result");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "No se pudo completar la operacion");
      setState("idle");
    }
    setProcessing(false);
  };

  const dismissResult = () => {
    setState("idle");
    setResult(null);
    loadSession();
  };

  const s = styles(theme);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[s.loadingText, { color: theme.colors.textSecondary }]}>Cargando turno...</Text>
      </View>
    );
  }

  if (state === "camera_start" || state === "camera_end") {
    return (
      <View style={s.container}>
        <View style={s.cameraHeader}>
          <TouchableOpacity onPress={() => setState("idle")} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.cameraTitle}>
            {state === "camera_start" ? "Iniciar Visita" : "Cerrar Visita"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        {Platform.OS !== "web" && Camera && (
          <>
            <Camera style={s.camera} ref={cameraRef} type={CameraType.front}>
              <View style={s.cameraOverlay}>
                <View style={s.faceGuide} />
              </View>
            </Camera>
            <View style={s.cameraActions}>
              <TouchableOpacity
                style={[s.captureBtn, { backgroundColor: state === "camera_start" ? theme.colors.success : theme.colors.danger }]}
                onPress={takePictureAndProcess}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="camera" size={22} color="#fff" />
                    <Text style={s.captureBtnText}>
                      {state === "camera_start" ? "Capturar e Iniciar" : "Capturar y Cerrar"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setState("idle")} disabled={processing}>
                <Text style={[s.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {Platform.OS === "web" && (
          <View style={s.webCameraFallback}>
            <Text style={[s.webFallbackText, { color: theme.colors.textSecondary }]}>
              La camara no esta disponible en web. Se registrara sin foto.
            </Text>
            <TouchableOpacity
              style={[s.captureBtn, { backgroundColor: state === "camera_start" ? theme.colors.success : theme.colors.danger, marginTop: 20 }]}
              onPress={takePictureAndProcess}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.captureBtnText}>
                  {state === "camera_start" ? "Iniciar Sin Foto" : "Cerrar Sin Foto"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (state === "verifying") {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Animated.View style={[s.verifyingIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="shield-checkmark-outline" size={56} color={theme.colors.primary} />
        </Animated.View>
        <Text style={[s.verifyingText, { color: theme.colors.text }]}>Verificando identidad...</Text>
        <Text style={[s.verifyingSub, { color: theme.colors.textSecondary }]}>Comparando con fotografia registrada</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (state === "result" && result) {
    const isStart = result.type === "start";
    const data = result.data;
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }]}>
        <View style={[s.resultIcon, { backgroundColor: (data.allowed !== false ? theme.colors.success : theme.colors.danger) + "15" }]}>
          <Ionicons
            name={data.allowed !== false ? "checkmark-circle" : "close-circle"}
            size={64}
            color={data.allowed !== false ? theme.colors.success : theme.colors.danger}
          />
        </View>
        <Text style={[s.resultTitle, { color: theme.colors.text }]}>
          {isStart ? "Visita Iniciada" : "Visita Cerrada"}
        </Text>
        <Text style={[s.resultSub, { color: theme.colors.textSecondary }]}>
          {isStart ? "Turno en curso" : `Horas trabajadas: ${data.worked_hours?.toFixed(1) || "0"}h`}
        </Text>
        {!isStart && data.overtime_hours > 0 && (
          <View style={[s.overtimeBadge, { backgroundColor: theme.colors.warning + "20" }]}>
            <Ionicons name="time-outline" size={16} color={theme.colors.warning} />
            <Text style={[s.overtimeText, { color: theme.colors.warning }]}>
              Horas extra: {data.overtime_hours.toFixed(1)}h
            </Text>
          </View>
        )}

        <View style={s.resultChecks}>
          {data.face_verified !== undefined && (
            <ResultCheck icon={data.face_verified ? "checkmark" : "close"} label="Identidad verificada" passed={data.face_verified} theme={theme} />
          )}
          {data.inside_geofence !== undefined && (
            <ResultCheck icon={data.inside_geofence ? "checkmark" : "close"} label="Dentro de geocerca" passed={data.inside_geofence} theme={theme} />
          )}
          {data.is_late_arrival && (
            <ResultCheck icon="alert" label="Llegada tardia detectada" passed={false} theme={theme} />
          )}
          {data.is_early_departure && (
            <ResultCheck icon="alert" label="Salida anticipada detectada" passed={false} theme={theme} />
          )}
          {data.auto_closed && (
            <ResultCheck icon="alert" label="Cierre automatico (fuera de geocerca)" passed={false} theme={theme} />
          )}
        </View>

        <TouchableOpacity style={[s.doneBtn, { backgroundColor: theme.colors.primary }]} onPress={dismissResult}>
          <Text style={s.doneBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.title}>Mi Turno</Text>
        <Text style={s.subtitle}>Control de visita en tiempo real</Text>
      </View>

      <OfflineBanner />

      {activeShift && session ? (
        <View style={s.activeSection}>
          <View style={[s.activeCard, { backgroundColor: (activeShift.color || theme.colors.primary) + "10", borderColor: activeShift.color || theme.colors.primary }]}>
            <View style={s.activeHeader}>
              <View style={[s.activeDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[s.activeLabel, { color: theme.colors.success }]}>Turno Activo</Text>
            </View>
            <Text style={[s.activeName, { color: theme.colors.text }]}>{activeShift.name}</Text>
            {activeShift.client_name && (
              <Text style={[s.activeClient, { color: theme.colors.textSecondary }]}>
                <Ionicons name="location-outline" size={14} /> {activeShift.client_name}
              </Text>
            )}

            <View style={s.timerRow}>
              <View style={s.timerBox}>
                <Text style={[s.timerLabel, { color: theme.colors.textSecondary }]}>Tiempo transcurrido</Text>
                <Text style={[s.timerValue, { color: theme.colors.text }]}>{elapsed}</Text>
              </View>
              <View style={[s.timerDivider, { backgroundColor: theme.colors.border }]} />
              <View style={s.timerBox}>
                <Text style={[s.timerLabel, { color: theme.colors.textSecondary }]}>Tiempo restante</Text>
                <Text style={[s.timerValue, { color: remaining.startsWith("00:") ? theme.colors.danger : theme.colors.text }]}>{remaining}</Text>
              </View>
            </View>

            <View style={s.sessionInfo}>
              <SessionInfoRow icon="time-outline" label="Inicio" value={session.entry_time ? new Date(session.entry_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "--:--"} theme={theme} />
              <SessionInfoRow icon="shield-checkmark-outline" label="Verificacion" value={session.face_verified ? "Aprobada" : "Pendiente"} theme={theme} passed={session.face_verified} />
              <SessionInfoRow icon="location-outline" label="Ubicacion" value={session.inside_geofence ? "Dentro" : "Fuera"} theme={theme} passed={session.inside_geofence} />
            </View>

            <TouchableOpacity
              style={[s.endBtn, { backgroundColor: theme.colors.danger }]}
              onPress={handleEndVisit}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#fff" />
              <Text style={s.endBtnText}>Cerrar Turno</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {nextShift && (
            <View style={s.nextSection}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Proximo Turno</Text>
              <TouchableOpacity
                style={[s.shiftCard, { backgroundColor: theme.colors.surface, borderLeftColor: nextShift.color || theme.colors.primary }]}
                onPress={() => handleStartVisit(nextShift)}
                activeOpacity={0.7}
              >
                <View style={s.shiftTime}>
                  <Text style={[s.shiftTimeText, { color: theme.colors.textSecondary }]}>{nextShift.start_time}</Text>
                  <View style={[s.shiftTimeLine, { backgroundColor: theme.colors.border }]} />
                  <Text style={[s.shiftTimeText, { color: theme.colors.textSecondary }]}>{nextShift.end_time}</Text>
                </View>
                <View style={s.shiftInfo}>
                  <Text style={[s.shiftName, { color: theme.colors.text }]}>{nextShift.name}</Text>
                  {nextShift.client_name && <Text style={[s.shiftClient, { color: theme.colors.textSecondary }]}>{nextShift.client_name}</Text>}
                </View>
                <View style={[s.startBtnInline, { backgroundColor: theme.colors.success }]}>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={s.startBtnText}>Iniciar</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {todayShifts.length > 0 && (
            <View style={s.shiftsSection}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Turnos de Hoy</Text>
              {todayShifts.map((shift) => (
                <View key={shift.id} style={[s.shiftRow, { backgroundColor: theme.colors.surface }]}>
                  <View style={[s.shiftColorBar, { backgroundColor: shift.color || theme.colors.primary }]} />
                  <View style={s.shiftRowInfo}>
                    <Text style={[s.shiftRowName, { color: theme.colors.text }]}>{shift.name}</Text>
                    <Text style={[s.shiftRowTime, { color: theme.colors.textSecondary }]}>{shift.start_time} - {shift.end_time}</Text>
                    {shift.client_name && <Text style={[s.shiftRowClient, { color: theme.colors.textMuted }]}>{shift.client_name}</Text>}
                  </View>
                  <ShiftStatusBadge status={shift.status} theme={theme} />
                </View>
              ))}
            </View>
          )}

          {todayShifts.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />
              <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>No hay turnos programados para hoy</Text>
            </View>
          )}
        </>
      )}

      <View style={s.footer}>
        <Text style={[s.footerText, { color: theme.colors.textMuted }]}>DLA Access Enterprise</Text>
      </View>
    </ScrollView>
  );
}

function ResultCheck({ icon, label, passed, theme }: any) {
  return (
    <View style={[checkStyles.row, { opacity: passed ? 1 : 0.6 }]}>
      <Ionicons
        name={icon === "checkmark" ? "checkmark-circle" : icon === "close" ? "close-circle" : "alert-circle"}
        size={20}
        color={passed ? theme.colors.success : theme.colors.danger}
      />
      <Text style={[checkStyles.label, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

const checkStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "500" },
});

function SessionInfoRow({ icon, label, value, theme, passed }: any) {
  return (
    <View style={[siStyles.row, { borderBottomColor: theme.colors.border }]}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      <Text style={[siStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[siStyles.value, { color: passed === false ? theme.colors.danger : theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const siStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, fontWeight: "600" },
});

function ShiftStatusBadge({ status, theme }: any) {
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
    <View style={[badgeStyles.badge, { backgroundColor: c + "18" }]}>
      <Text style={[badgeStyles.text, { color: c }]}>{labels[status] || status}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: "600" },
});

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    loadingText: { fontSize: 15, marginTop: 12 },
    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 26, fontWeight: "bold", color: t.colors.text },
    subtitle: { fontSize: 14, color: t.colors.textSecondary, marginTop: 2 },

    activeSection: { paddingHorizontal: 20, marginBottom: 20 },
    activeCard: { borderRadius: 18, padding: 20, borderWidth: 1 },
    activeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
    activeDot: { width: 10, height: 10, borderRadius: 5 },
    activeLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    activeName: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
    activeClient: { fontSize: 14, marginBottom: 16 },

    timerRow: { flexDirection: "row", marginBottom: 16, backgroundColor: t.colors.surface, borderRadius: 12, padding: 16 },
    timerBox: { flex: 1, alignItems: "center" },
    timerDivider: { width: 1, marginHorizontal: 12 },
    timerLabel: { fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
    timerValue: { fontSize: 24, fontWeight: "bold", fontVariant: ["tabular-nums"] },

    sessionInfo: { marginBottom: 16 },

    endBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
    endBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    nextSection: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
    shiftCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderLeftWidth: 4, shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.dark ? 0.2 : 0.04, shadowRadius: 3, elevation: 1 },
    shiftTime: { alignItems: "center", marginRight: 14, width: 44 },
    shiftTimeText: { fontSize: 12, fontWeight: "600" },
    shiftTimeLine: { width: 1, height: 16, marginVertical: 4 },
    shiftInfo: { flex: 1 },
    shiftName: { fontSize: 15, fontWeight: "600" },
    shiftClient: { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
    startBtnInline: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    startBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    shiftsSection: { paddingHorizontal: 20, marginBottom: 20 },
    shiftRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 8 },
    shiftColorBar: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
    shiftRowInfo: { flex: 1 },
    shiftRowName: { fontSize: 14, fontWeight: "600" },
    shiftRowTime: { fontSize: 12, marginTop: 2 },
    shiftRowClient: { fontSize: 11, marginTop: 1 },

    emptyCard: { backgroundColor: t.colors.surface, borderRadius: 14, padding: 40, alignItems: "center", marginHorizontal: 20 },
    emptyText: { fontSize: 14, marginTop: 12 },

    cameraHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: "#000" },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
    cameraTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
    camera: { flex: 1, borderRadius: 0 },
    cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
    faceGuide: { width: 180, height: 240, borderRadius: 90, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", borderStyle: "dashed" },
    cameraActions: { padding: 20, backgroundColor: "#000" },
    captureBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
    captureBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    cancelBtn: { height: 44, justifyContent: "center", alignItems: "center" },
    cancelBtnText: { fontSize: 15, fontWeight: "500" },
    webCameraFallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
    webFallbackText: { fontSize: 15, textAlign: "center" },

    verifyingIcon: { marginBottom: 20 },
    verifyingText: { fontSize: 20, fontWeight: "bold" },
    verifyingSub: { fontSize: 14, marginTop: 6 },

    resultIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 20 },
    resultTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
    resultSub: { fontSize: 15, marginBottom: 4 },
    overtimeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    overtimeText: { fontSize: 13, fontWeight: "600" },
    resultChecks: { alignSelf: "stretch", marginBottom: 28 },
    doneBtn: { height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", alignSelf: "stretch" },
    doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

    footer: { alignItems: "center", paddingVertical: 24 },
    footerText: { fontSize: 12 },
  });
}
