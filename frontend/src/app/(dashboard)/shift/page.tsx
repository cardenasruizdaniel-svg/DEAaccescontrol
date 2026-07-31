"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useGeolocation, isInsideGeofence, calculateDistance } from "@/hooks/useGeolocation";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/sync";
import { ShiftCamera } from "@/components/shift/ShiftCamera";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Clock, MapPin, Camera, Wifi, WifiOff, Navigation, CheckCircle, XCircle } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";

interface ActiveShift {
  id: string;
  employee_id: string;
  client_id: string;
  client_name: string;
  persona_name: string;
  address: string;
  start_time: string;
  estimated_end: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  start_lat?: number;
  start_lng?: number;
  geofence_lat?: number;
  geofence_lng?: number;
  geofence_radius?: number;
}

type ShiftStep = "idle" | "geolocation" | "biometric" | "confirming" | "active" | "end_geolocation" | "end_biometric" | "end_confirming";

export default function ShiftPage() {
  const { user, employeeId } = useAuthStore();
  const online = useOnlineStatus();
  const { position, getCurrentPosition } = useGeolocation();
  const [shift, setShift] = useState<ActiveShift | null>(null);
  const [step, setStep] = useState<ShiftStep>("idle");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [geofenceOk, setGeofenceOk] = useState(false);
  const [biometricOk, setBiometricOk] = useState(false);
  const [todayShift, setTodayShift] = useState<ActiveShift | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.id) loadTodayShift();
  }, [user]);

  const loadTodayShift = async () => {
    try {
      const eid = employeeId || user?.employee_id || user?.id;
      if (!eid) return;
      const res = await api.get(`/scheduling/shifts/today?employee_id=${eid}`);
      if (res.data) {
        setTodayShift(res.data);
        if (res.data.status === "in_progress") {
          setShift(res.data);
          setStep("active");
          const start = new Date(res.data.start_time).getTime();
          setTimeElapsed(Math.floor((Date.now() - start) / 1000));
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (shift?.status === "in_progress" && timerRef.current === null) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [shift?.status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startGeolocationCheck = async () => {
    setError(null);
    setStep("geolocation");
    const pos = await getCurrentPosition();
    if (!pos) { setError("No se pudo obtener ubicación. Verifique los permisos GPS."); return; }
    if (todayShift?.geofence_lat && todayShift?.geofence_lng && todayShift?.geofence_radius) {
      const inside = isInsideGeofence(pos.lat, pos.lng, todayShift.geofence_lat, todayShift.geofence_lng, todayShift.geofence_radius);
      if (!inside) {
        const dist = calculateDistance(pos.lat, pos.lng, todayShift.geofence_lat, todayShift.geofence_lng);
        setError(`Fuera del área permitida. Distancia: ${Math.round(dist)}m (máx: ${todayShift.geofence_radius}m)`);
        return;
      }
    }
    setGeofenceOk(true);
    setStep("biometric");
  };

  const handleBiometricVerified = (dataUrl: string) => {
    setBiometricOk(true);
    setStep("confirming");
  };

  const handleBiometricError = (err: string) => {
    setError(err);
    setStep("biometric");
  };

  const confirmStartShift = async () => {
    if (!todayShift || !position) return;
    try {
      const payload: Record<string, unknown> = {
        shift_id: todayShift.id,
        start_time: new Date().toISOString(),
        latitude: position.lat,
        longitude: position.lng,
        accuracy: position.accuracy,
      };
      if (online) {
        const res = await api.post(`/scheduling/shifts/${todayShift.id}/start`, payload);
        setShift(res.data);
      } else {
        await enqueue("shift", "update", { ...payload, status: "in_progress" });
        setShift({ ...todayShift, status: "in_progress", start_time: new Date().toISOString() });
      }
      setStep("active");
      setTimeElapsed(0);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Error al iniciar turno");
    }
  };

  const startEndShift = () => {
    setError(null);
    setGeofenceOk(false);
    setBiometricOk(false);
    setStep("end_geolocation");
    endGeolocationCheck();
  };

  const endGeolocationCheck = async () => {
    setStep("end_geolocation");
    const pos = await getCurrentPosition();
    if (!pos) { setError("No se pudo obtener ubicación."); return; }
    if (shift?.geofence_lat && shift?.geofence_lng && shift?.geofence_radius) {
      const inside = isInsideGeofence(pos.lat, pos.lng, shift.geofence_lat, shift.geofence_lng, shift.geofence_radius);
      if (!inside) {
        const dist = calculateDistance(pos.lat, pos.lng, shift.geofence_lat, shift.geofence_lng);
        setError(`Fuera del área permitida para finalizar. Distancia: ${Math.round(dist)}m`);
        return;
      }
    }
    setGeofenceOk(true);
    setStep("end_biometric");
  };

  const confirmEndShift = async () => {
    if (!shift || !position) return;
    try {
      const payload: Record<string, unknown> = {
        end_time: new Date().toISOString(),
        latitude: position.lat,
        longitude: position.lng,
        accuracy: position.accuracy,
        worked_seconds: timeElapsed,
      };
      if (online) {
        const res = await api.post(`/scheduling/shifts/${shift.id}/end`, payload);
        setShift(res.data);
      } else {
        await enqueue("shift", "update", { ...payload, status: "completed" });
        setShift({ ...shift, status: "completed" });
      }
      setStep("idle");
      setTodayShift(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Error al finalizar turno");
    }
  };

  if (step === "active" && shift) {
    return (
      <div className="max-w-lg mx-auto space-y-4 p-4">
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-success text-success-foreground">En curso</Badge>
              <span className="text-3xl font-bold font-mono tabular-nums">{formatTime(timeElapsed)}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Inicio: {new Date(shift.start_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {shift.client_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Cliente: {shift.client_name}</span>
                </div>
              )}
              {shift.address && (
                <p className="text-xs text-muted-foreground ml-6">{shift.address}</p>
              )}
            </div>
          </CardContent>
        </Card>
        {shift.geofence_lat && shift.geofence_lng && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span>Monitoreo de geocerca activo</span>
          </div>
        )}
        <Button variant="destructive" className="w-full" onClick={startEndShift}>
          <Square className="mr-2 h-4 w-4" />Finalizar Turno
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!online && (
        <div className="flex items-center gap-2 p-2 rounded bg-amber-50 text-amber-700 text-xs border border-amber-200">
          <WifiOff className="h-3 w-3" />
          <span>Modo offline — los datos se sincronizarán cuando haya conexión</span>
        </div>
      )}

      {step === "idle" && todayShift && todayShift.status === "scheduled" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Turno Programado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Cliente:</span> {todayShift.client_name}</p>
              {todayShift.persona_name && <p><span className="text-muted-foreground">Persona:</span> {todayShift.persona_name}</p>}
              {todayShift.address && <p><span className="text-muted-foreground">Dirección:</span> {todayShift.address}</p>}
              <p><span className="text-muted-foreground">Hora:</span> {todayShift.start_time?.slice(0, 5)} - {todayShift.estimated_end?.slice(0, 5)}</p>
            </div>
            <Button className="w-full gap-2" onClick={startGeolocationCheck}>
              <Play className="h-4 w-4" />Ingresar al Turno
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "idle" && !todayShift && (
        <Card>
          <CardContent className="text-center py-8 space-y-4">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Sin turno activo</p>
              <p className="text-sm text-muted-foreground">Seleccione una visita desde su programación para iniciar</p>
            </div>
            <Button onClick={() => window.location.href = "/my-scheduling"}>
              Ver Programación
            </Button>
          </CardContent>
        </Card>
      )}

      {(step === "geolocation" || step === "end_geolocation") && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Validación de Ubicación</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {position ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span>Ubicación obtenida</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">Precisión: ±{Math.round(position.accuracy)}m</p>
                {geofenceOk && (
                  <Badge variant="success">Dentro del área permitida</Badge>
                )}
                {step === "geolocation" && geofenceOk && step === "geolocation" && (
                  <Button className="w-full" onClick={() => setStep("biometric")}>Continuar</Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground animate-pulse mb-2" />
                <p className="text-sm">Obteniendo ubicación GPS...</p>
                <p className="text-xs text-muted-foreground">Active la ubicación de alta precisión</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(step === "biometric" || step === "end_biometric") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              Verificación Biométrica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftCamera
              employeeId={employeeId || user?.employee_id || user?.id || ""}
              onVerified={(dataUrl) => {
                if (step === "biometric") handleBiometricVerified(dataUrl);
                else { setBiometricOk(true); setStep("end_confirming"); }
              }}
              onError={handleBiometricError}
              mode={step === "biometric" ? "start" : "end"}
            />
          </CardContent>
        </Card>
      )}

      {step === "confirming" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-5 w-5" />
              <span>Validaciones completas</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ Ubicación verificada</p>
              <p>✓ Identidad verificada</p>
            </div>
            <Button className="w-full gap-2" onClick={confirmStartShift}>
              <Play className="h-4 w-4" />Iniciar Turno
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("idle")}>Cancelar</Button>
          </CardContent>
        </Card>
      )}

      {step === "end_confirming" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-5 w-5" />
              <span>Validaciones completas</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ Ubicación final verificada</p>
              <p>✓ Identidad verificada</p>
            </div>
            <p className="text-sm">Tiempo trabajado: {formatTime(timeElapsed)}</p>
            <Button variant="destructive" className="w-full gap-2" onClick={confirmEndShift}>
              <Square className="h-4 w-4" />Finalizar Turno
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("active")}>Cancelar</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
