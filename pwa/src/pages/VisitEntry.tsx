import { useState, useRef, useCallback, useEffect } from "react";
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
  MapPin, Clock, Camera, CheckCircle, XCircle, AlertTriangle,
  Loader2, ArrowLeft, Navigation
} from "lucide-react";

type Step = "info" | "capturing" | "verifying" | "geolocating" | "checking_geofence" | "error" | "success";

export function VisitEntryPage() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("info");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const positionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const { position, getCurrentPosition, calculateDistance } = useGeolocation();

  useEffect(() => {
    if (position) positionRef.current = { latitude: position.latitude, longitude: position.longitude };
  }, [position]);

  const { data: shift, isLoading: loadingShift } = useQuery({
    queryKey: ["shift", shiftId],
    queryFn: () => mobileApi.shifts({ start_date: "", end_date: "" }).then((shifts) => shifts.find((s) => s.id === shiftId)),
    enabled: !!shiftId,
  });

  useEffect(() => {
    if (shift?.client_latitude && shift?.client_longitude && position) {
      const d = calculateDistance(
        position.latitude, position.longitude,
        shift.client_latitude, shift.client_longitude
      );
      setDistance(Math.round(d));
    }
  }, [position, shift, calculateDistance]);

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
    } catch {
      setErrorMsg("No se pudo acceder a la cámara");
      setStep("error");
    }
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
    setStep("verifying");
    handleVerifyFace(dataUrl);
  };

  const handleVerifyFace = async (photoDataUrl: string) => {
    setStep("verifying");
    try {
      if (navigator.onLine) {
        const res = await biometricApi.verify(photoDataUrl);
        if (!res.verified) {
          await auditStore.log({
            event: "biometric_failed", shift_id: shiftId,
            details: `Verificación biométrica fallida: ${res.message}`,
            latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
            success: false,
          });
          setErrorMsg("No fue posible validar la identidad del empleado");
          setStep("error");
          return;
        }
      } else {
        await auditStore.log({
          event: "biometric_offline_bypass", shift_id: shiftId,
          details: "Verificación biométrica omitida en modo offline",
          latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
          success: true,
        });
      }
      await auditStore.log({
        event: "biometric_success", shift_id: shiftId,
        details: "Verificación biométrica exitosa",
        latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
        success: true,
      });
      setStep("geolocating");
      await handleGeolocationCheck(photoDataUrl);
    } catch {
      await auditStore.log({
        event: "biometric_error", shift_id: shiftId,
        details: "Error al conectar con servicio biométrico",
        success: false,
      });
      setErrorMsg("Error en verificación biométrica. Intente de nuevo.");
      setStep("error");
    }
  };

  const handleGeolocationCheck = async (photoDataUrl: string) => {
    setErrorMsg(null);
    getCurrentPosition();
    await new Promise((r) => setTimeout(r, 2000));

    const currentPos = positionRef.current;
    if (!currentPos) {
      await auditStore.log({
        event: "geolocation_failed", shift_id: shiftId,
        details: "No se pudo obtener ubicación GPS",
        success: false,
      });
      setErrorMsg("No se pudo obtener la ubicación. Verifica el GPS.");
      setStep("error");
      return;
    }

    if (shift?.client_latitude && shift?.client_longitude) {
      const dist = calculateDistance(
        currentPos.latitude, currentPos.longitude,
        shift.client_latitude, shift.client_longitude
      );
      setDistance(Math.round(dist));

      try {
        if (navigator.onLine && shift.client_id) {
          const geoCheck = await mobileApi.checkGeofence({
            latitude: currentPos.latitude,
            longitude: currentPos.longitude,
            client_id: shift.client_id,
          });
          if (!geoCheck.inside) {
            await auditStore.log({
              event: "geofence_failed", shift_id: shiftId,
              details: `Empleado fuera de geocerca. Distancia: ${Math.round(dist)}m`,
              latitude: currentPos.latitude, longitude: currentPos.longitude,
              success: false,
            });
            setErrorMsg(`No se encuentra en la ubicación autorizada. Distancia: ${Math.round(dist)}m`);
            setStep("error");
            return;
          }
        } else if (dist > 500) {
          await auditStore.log({
            event: "geofence_failed_offline", shift_id: shiftId,
            details: `Empleado fuera de geocerca (offline). Distancia: ${Math.round(dist)}m`,
            latitude: currentPos.latitude, longitude: currentPos.longitude,
            success: false,
          });
          setErrorMsg(`No se encuentra en la ubicación autorizada. Distancia: ${Math.round(dist)}m`);
          setStep("error");
          return;
        }
      } catch {
        if (dist > 500) {
          setErrorMsg(`No se encuentra en la ubicación autorizada. Distancia: ${Math.round(dist)}m`);
          setStep("error");
          return;
        }
      }
    }

    await registerEntry(photoDataUrl);
  };

  const registerEntry = async (photoDataUrl: string) => {
    setStep("checking_geofence");
    try {
      const entryData = {
        shift_id: shiftId!,
        latitude: positionRef.current?.latitude || 0,
        longitude: positionRef.current?.longitude || 0,
        photo_base64: photoDataUrl,
      };

      if (navigator.onLine) {
        await shiftApi.start(entryData);
      } else {
        await enqueue("create", "visits", {
          ...entryData,
          status: "active",
          started_at: new Date().toISOString(),
        });
      }

      await timerStore.start(shiftId!);
      await db.put("config", { key: "active_shift_id", value: shiftId } as unknown as Record<string, unknown>);

      await auditStore.log({
        event: "shift_started", shift_id: shiftId,
        details: "Turno iniciado exitosamente",
        latitude: positionRef.current?.latitude, longitude: positionRef.current?.longitude,
        success: true,
      });

      setStep("success");
      setTimeout(() => navigate(`/visit/${shiftId}/active`, { replace: true }), 1500);
    } catch {
      setErrorMsg("Error al registrar el ingreso");
      setStep("error");
    }
  };

  const handleStartProcess = async () => {
    setErrorMsg(null);
    setStep("capturing");
    startCamera();
  };

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <XCircle className="h-12 w-12 text-danger" />
        <p className="font-bold">Turno no encontrado</p>
        <Button variant="outline" onClick={() => navigate("/scheduling")}>Volver a Agenda</Button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h2 className="text-xl font-bold">Turno Iniciado</h2>
        <p className="text-text-secondary">Redirigiendo al turno activo...</p>
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <button onClick={() => navigate("/scheduling")} className="flex items-center gap-2 text-text-secondary mb-2">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Volver a Agenda</span>
      </button>

      <div>
        <h1 className="text-xl font-bold">Ingreso a Labores</h1>
        <p className="text-sm text-text-secondary">Verifica tu identidad y ubicación</p>
      </div>

      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-lg">{shift.client_name || shift.name}</p>
            {shift.client_address && (
              <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />{shift.client_address}
              </p>
            )}
          </div>
          <Badge variant={shift.status === "pending" ? "warning" : "info"}>{shift.status}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatTime(shift.start_time)} — {formatTime(shift.end_time)}</span>
        </div>
        {distance !== null && (
          <div className="flex items-center gap-1 text-sm mt-2">
            <Navigation className="h-4 w-4 text-primary" />
            <span className={distance <= 500 ? "text-success" : "text-danger"}>
              {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} del destino
            </span>
          </div>
        )}
        {shift.observations && (
          <p className="text-xs text-text-secondary bg-muted rounded-lg p-2 mt-3">{shift.observations}</p>
        )}
      </Card>

      {step === "capturing" && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { stopCamera(); setStep("info"); }}>
              Cancelar
            </Button>
            <Button onClick={capturePhoto}>
              <Camera className="h-4 w-4 mr-2" />Tomar Fotografía
            </Button>
          </div>
        </div>
      )}

      {step === "verifying" && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-medium">Verificando identidad biométrica...</p>
        </div>
      )}

      {step === "geolocating" && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-medium">Verificando ubicación GPS...</p>
        </div>
      )}

      {step === "checking_geofence" && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-medium">Registrando ingreso...</p>
        </div>
      )}

      {step === "error" && errorMsg && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-danger">Error</p>
              <p className="text-sm text-danger/80 mt-1">{errorMsg}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => { setStep("info"); }}>
              Reintentar
            </Button>
            <Button variant="outline" onClick={() => navigate("/scheduling")}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {step === "info" && (
        <Button onClick={handleStartProcess} size="lg" className="bg-success hover:bg-green-700 text-white text-lg font-bold h-14 rounded-2xl shadow-lg shadow-success/25">
          <Camera className="h-6 w-6 mr-2" />Ingresar al Turno
        </Button>
      )}
    </div>
  );
}
