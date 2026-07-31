import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { mobileApi, shiftApi, biometricApi } from "@/api/endpoints";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/utils";
import { timerStore } from "@/stores/timerStore";
import { auditStore } from "@/stores/auditStore";
import { enqueue } from "@/lib/sync";
import { db } from "@/lib/db";
import {
  Clock, MapPin, Navigation, Camera, CheckCircle,
  AlertTriangle, Loader2, StopCircle
} from "lucide-react";

type Step = "active" | "ending_camera" | "ending_verify" | "ending_geo" | "ending_geofence_check" | "completed" | "error";

export function ActiveVisitPage() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("active");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const geofenceRef = useRef<number | null>(null);
  const positionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const { position, getCurrentPosition, calculateDistance } = useGeolocation();

  useEffect(() => {
    if (position) positionRef.current = { latitude: position.latitude, longitude: position.longitude };
  }, [position]);

  const { data: shift } = useQuery({
    queryKey: ["shift", shiftId],
    queryFn: () => mobileApi.shifts({}).then((shifts) => shifts.find((s) => s.id === shiftId)),
    enabled: !!shiftId,
  });

  useEffect(() => {
    loadElapsedAndStartTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); if (geofenceRef.current) clearInterval(geofenceRef.current); };
  }, [shiftId]);

  const loadElapsedAndStartTimer = async () => {
    const ms = await timerStore.getElapsedMs();
    setElapsed(Math.floor(ms / 1000));
    timerRef.current = window.setInterval(async () => {
      const ms2 = await timerStore.getElapsedMs();
      setElapsed(Math.floor(ms2 / 1000));
    }, 1000);
  };

  useEffect(() => {
    if (shift?.client_latitude && shift?.client_longitude) {
      const interval = setInterval(async () => {
        const currentPos = positionRef.current;
        if (currentPos) {
          const dist = calculateDistance(
            currentPos.latitude, currentPos.longitude,
            shift.client_latitude!, shift.client_longitude!
          );
          setDistance(Math.round(dist));
          if (dist > 500 && step === "active") {
            await handleAutoClose(dist);
          }
        }
      }, 15000);
      geofenceRef.current = interval;
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shift, step]);

  const handleAutoClose = async (dist: number) => {
    await auditStore.log({
      event: "auto_close_geofence", shift_id: shiftId,
      details: `Cierre automático por salida de geocerca. Distancia: ${Math.round(dist)}m`,
      latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
      success: true,
    });
    try {
      if (navigator.onLine) {
        await shiftApi.end({
          shift_id: shiftId!,
          latitude: positionRef.current?.latitude || 0,
          longitude: positionRef.current?.longitude || 0,
          observations: "Cierre automático por salida de geocerca",
        });
      } else {
        await enqueue("update", "visits", {
          id: shiftId, end_time: new Date().toISOString(),
          end_latitude: positionRef.current?.latitude, end_longitude: positionRef.current?.longitude,
          status: "auto_closed", auto_close_reason: "geofence_exit",
        });
      }
      await timerStore.complete();
    } catch { /* silent */ }
    setStep("completed");
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setErrorMsg("No se pudo acceder a la cámara"); setStep("error"); }
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.7);
    stopCamera();
    setStep("ending_verify");
    handleEndVerify(dataUrl);
  };

  const handleEndVerify = async (photoDataUrl: string) => {
    try {
      if (navigator.onLine) {
        const res = await biometricApi.verify(photoDataUrl);
        if (!res.verified) {
          await auditStore.log({
            event: "end_biometric_failed", shift_id: shiftId,
            details: `Verificación biométrica de salida fallida`,
            latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
            success: false,
          });
          setErrorMsg("No fue posible validar la identidad del empleado");
          setStep("error");
          return;
        }
      }
      await auditStore.log({
        event: "end_biometric_success", shift_id: shiftId,
        details: "Verificación biométrica de salida exitosa",
        success: true,
      });
      setStep("ending_geo");
      handleEndGeolocation(photoDataUrl);
    } catch {
      setErrorMsg("Error en verificación biométrica");
      setStep("error");
    }
  };

  const handleEndGeolocation = async (photoDataUrl: string) => {
    getCurrentPosition();
    await new Promise((r) => setTimeout(r, 2000));
    if (!positionRef.current) {
      setErrorMsg("No se pudo obtener ubicación GPS");
      setStep("error");
      return;
    }
    setStep("ending_geofence_check");
    await finishShift(photoDataUrl);
  };

  const finishShift = async (photoDataUrl: string) => {
    try {
      if (navigator.onLine) {
        await shiftApi.end({
          shift_id: shiftId!,
          latitude: positionRef.current?.latitude || 0,
          longitude: positionRef.current?.longitude || 0,
          photo_base64: photoDataUrl,
          observations: "Turno finalizado manualmente",
        });
      } else {
        await enqueue("update", "visits", {
          id: shiftId, end_time: new Date().toISOString(),
          end_latitude: positionRef.current?.latitude, end_longitude: positionRef.current?.longitude,
          end_photo: photoDataUrl, status: "completed",
        });
      }
      await timerStore.complete();
      await db.delete("config", "active_shift_id");
      await auditStore.log({
        event: "shift_ended", shift_id: shiftId,
        details: "Turno finalizado manualmente exitosamente",
        latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
        success: true,
      });
      setStep("completed");
      if (timerRef.current) clearInterval(timerRef.current);
    } catch {
      setErrorMsg("Error al finalizar el turno");
      setStep("error");
    }
  };

  const handleEndProcess = () => {
    setErrorMsg(null);
    setStep("ending_camera");
    startCamera();
  };

  if (step === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h2 className="text-xl font-bold">Turno Finalizado</h2>
        <p className="text-text-secondary text-center">
          Tiempo trabajado: <strong>{Math.floor(elapsed / 3600).toString().padStart(2, "0")}:{Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}</strong>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/scheduling")}>Ir a Agenda</Button>
          <Button onClick={() => navigate("/dashboard")}>Ir a Inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Turno en Curso</h1>
        <Badge variant="success" className="animate-pulse">EN CURSO</Badge>
      </div>

      {shift && (
        <Card className="border-l-4 border-l-success">
          <p className="font-bold text-lg">{shift.client_name || shift.name}</p>
          {shift.client_address && (
            <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />{shift.client_address}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatTime(shift.start_time)} — {formatTime(shift.end_time)}</span>
          </div>
          {shift.observations && (
            <p className="text-xs text-text-secondary bg-muted rounded-lg p-2 mt-2">{shift.observations}</p>
          )}
        </Card>
      )}

      <Card className="text-center py-6">
        <p className="text-5xl font-bold text-primary tabular-nums mb-2">
          {Math.floor(elapsed / 3600).toString().padStart(2, "0")}:
          {Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0")}:
          {(elapsed % 60).toString().padStart(2, "0")}
        </p>
        <p className="text-sm text-text-secondary">Tiempo transcurrido</p>
        {distance !== null && (
          <div className="flex items-center justify-center gap-1 mt-3 text-sm">
            <Navigation className="h-4 w-4 text-primary" />
            <span className={distance <= 500 ? "text-success" : "text-danger"}>
              {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} del servicio
            </span>
          </div>
        )}
      </Card>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 text-danger text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-xs">Error</p>
            <span>{errorMsg}</span>
            {step === "error" && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { setStep("active"); setErrorMsg(null); }}>
                Reintentar
              </Button>
            )}
          </div>
        </div>
      )}

      {step === "ending_camera" && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { stopCamera(); setStep("active"); }}>Cancelar</Button>
            <Button onClick={capturePhoto}><Camera className="h-4 w-4 mr-2" />Tomar Foto</Button>
          </div>
        </div>
      )}

      {(step === "ending_verify" || step === "ending_geo" || step === "ending_geofence_check") && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-medium">
            {step === "ending_verify" ? "Verificando identidad..." :
             step === "ending_geo" ? "Obteniendo ubicación..." :
             "Registrando salida..."}
          </p>
        </div>
      )}

      {step === "active" && (
        <Button onClick={handleEndProcess} variant="danger" size="lg" className="h-14 rounded-2xl text-lg font-bold shadow-lg shadow-danger/25">
          <StopCircle className="h-6 w-6 mr-2" />Finalizar Turno
        </Button>
      )}
    </div>
  );
}
