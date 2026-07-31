import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { mobileApi, shiftApi } from "@/api/endpoints";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useBiometric } from "@/hooks/useBiometric";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatHours, formatTime } from "@/lib/utils";
import { enqueue } from "@/lib/sync";
import {
  Play, StopCircle, Camera, MapPin, CheckCircle,
  Loader2, Clock, AlertTriangle
} from "lucide-react";

type Step = "idle" | "geolocation" | "biometric" | "confirming" | "active" | "end_geolocation" | "end_biometric" | "end_confirming" | "completed";

export function ShiftPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const { position, getCurrentPosition } = useGeolocation();
  const { verifying, verifyFace } = useBiometric();

  const { data: session } = useQuery({
    queryKey: ["activeSession"],
    queryFn: mobileApi.activeSession,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (session?.active && session.session?.entry_time) {
      setStep("active");
    } else {
      setStep("idle");
    }
  }, [session]);

  useEffect(() => {
    if (step === "active" && session?.session?.entry_time) {
      const start = new Date(session.session.entry_time).getTime();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [step, session]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCapturing(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCapturing(true);
    } catch { setError("No se pudo acceder a la cámara"); }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.7);
    setPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleStartGeolocation = async () => {
    setError(null);
    const shiftIds = session?.today_shifts?.map((s) => s.id) || [];
    if (shiftIds.length === 1) {
      setSelectedShiftId(shiftIds[0]);
    } else if (shiftIds.length > 1) {
      setError("Tienes múltiples turnos hoy. Selecciona uno desde Mi Agenda.");
      return;
    } else {
      setError("No tienes turnos programados para hoy.");
      return;
    }
    getCurrentPosition();
    await new Promise((r) => setTimeout(r, 1500));
    if (!position) { setError("No se pudo obtener la ubicación. Verifica el GPS."); return; }
    setStep("biometric");
    startCamera();
  };

  const handleBiometricVerify = async () => {
    if (!photo) { setError("Toma una fotografía primero"); return; }
    setStep("confirming");
    const ok = await verifyFace(photo);
    if (!ok) { setError("Verificación biométrica fallida. Intenta de nuevo."); setStep("biometric"); return; }
  };

  const handleStartShift = async () => {
    setError(null);
    if (!selectedShiftId) { setError("No hay turno seleccionado"); return; }
    try {
      await shiftApi.start({
        shift_id: selectedShiftId,
        latitude: position?.latitude || 0,
        longitude: position?.longitude || 0,
        photo_base64: photo || undefined,
        device_id: navigator.userAgent,
        battery_level: (navigator as any)?.getBattery ? await (navigator as any).getBattery().then((b: any) => b.level * 100).catch(() => undefined) : undefined,
      });
      setStep("active");
    } catch {
      await enqueue("create", "shifts", { shift_id: selectedShiftId, latitude: position?.latitude, longitude: position?.longitude, status: "active" });
      setStep("active");
    }
  };

  const handleEndGeolocation = () => {
    setError(null);
    getCurrentPosition();
    setStep("end_biometric");
    startCamera();
  };

  const handleEndBiometric = async () => {
    if (!photo) { setError("Toma una fotografía primero"); return; }
    setStep("end_confirming");
    const ok = await verifyFace(photo);
    if (!ok) { setError("Verificación biométrica fallida."); setStep("end_biometric"); return; }
  };

  const handleEndShift = async () => {
    setError(null);
    if (!selectedShiftId && !session?.shift?.id) { setError("No hay turno activo"); return; }
    const shiftId = selectedShiftId || session?.shift?.id || "";
    try {
      await shiftApi.end({
        shift_id: shiftId,
        latitude: position?.latitude || 0,
        longitude: position?.longitude || 0,
        photo_base64: photo || undefined,
        observations: "Turno finalizado desde app móvil",
      });
    } catch {
      await enqueue("update", "shifts", { id: shiftId, end_time: new Date().toISOString(), status: "completed" });
    }
    setStep("completed");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (step === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h2 className="text-xl font-bold">Turno Finalizado</h2>
        <p className="text-text-secondary text-center">Tiempo trabajado: <strong>{formatHours(elapsed / 3600)}</strong></p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Volver al Inicio</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mi Turno</h1>
        {step === "active" && <Badge variant="success" className="animate-pulse">EN CURSO</Badge>}
      </div>

      {session?.shift && step !== "active" && (
        <Card className="border-l-4 border-l-primary">
          <p className="text-sm font-bold">{session.shift.client_name || session.shift.name}</p>
          <p className="text-xs text-text-secondary mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            {formatTime(session.shift.start_time)} — {formatTime(session.shift.end_time)}
          </p>
          {session.shift.client_address && (
            <p className="text-xs text-text-secondary mt-1">
              <MapPin className="h-3 w-3 inline mr-1" />
              {session.shift.client_address}
            </p>
          )}
        </Card>
      )}

      {step === "active" && (
        <Card className="text-center py-6">
          <p className="text-5xl font-bold text-primary tabular-nums mb-2">
            {Math.floor(elapsed / 3600).toString().padStart(2, "0")}:
            {Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0")}:
            {(elapsed % 60).toString().padStart(2, "0")}
          </p>
          <p className="text-sm text-text-secondary">Tiempo transcurrido</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-text-secondary">
            <MapPin className="h-3 w-3" />
            {position ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : "Obteniendo ubicación..."}
          </div>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 text-danger text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(step === "biometric" || step === "end_biometric") && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {!capturing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Button onClick={startCamera}><Camera className="h-4 w-4 mr-2" />Activar Cámara</Button>
              </div>
            )}
          </div>
          {photo && <img src={photo} alt="Preview" className="w-24 h-24 rounded-xl object-cover mx-auto" />}
          <div className="flex gap-2">
            {capturing && <Button variant="outline" onClick={capturePhoto}><Camera className="h-4 w-4 mr-2" />Capturar</Button>}
            {photo && !verifying && step === "end_biometric" && <Button onClick={handleEndBiometric}><CheckCircle className="h-4 w-4 mr-2" />Verificar Salida</Button>}
            {photo && !verifying && step !== "end_biometric" && <Button onClick={handleBiometricVerify}><CheckCircle className="h-4 w-4 mr-2" />Verificar</Button>}
            {verifying && <Button loading disabled>Verificando...</Button>}
          </div>
        </div>
      )}

      {step === "confirming" && (
        <div className="space-y-3">
          <Card>
            <p className="font-bold mb-3">Confirmar inicio de turno</p>
            <div className="space-y-2 text-sm text-text-secondary">
              {position && <p>Ubicación: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>}
              {photo && <p>Fotografía capturada ✓</p>}
            </div>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep("idle"); stopCamera(); setPhoto(null); setError(null); }}>Cancelar</Button>
            <Button onClick={handleStartShift}><Play className="h-4 w-4 mr-2" />Iniciar Turno</Button>
          </div>
        </div>
      )}

      {step === "end_confirming" && (
        <div className="space-y-3">
          <Card>
            <p className="font-bold mb-3">Confirmar finalización</p>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Tiempo: {formatHours(elapsed / 3600)}</p>
              {position && <p>Ubicación de salida capturada ✓</p>}
              {photo && <p>Fotografía de salida ✓</p>}
            </div>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep("active"); stopCamera(); setPhoto(null); setError(null); }}>Cancelar</Button>
            <Button onClick={handleEndShift}><StopCircle className="h-4 w-4 mr-2" />Finalizar Turno</Button>
          </div>
        </div>
      )}

      {step === "idle" && (
        <div className="space-y-3">
          {session?.active ? (
            <Button onClick={handleEndGeolocation} variant="danger" size="lg">
              <StopCircle className="h-5 w-5 mr-2" />Finalizar Turno Activo
            </Button>
          ) : (
            <>
              <Card className="text-center py-8">
                <Play className="h-12 w-12 mx-auto mb-3 text-primary opacity-50" />
                <h2 className="font-bold text-lg mb-1">Sin turno activo</h2>
                <p className="text-sm text-text-secondary mb-4">Presiona para iniciar tu turno</p>
                <Button onClick={handleStartGeolocation} size="lg">
                  <Play className="h-5 w-5 mr-2" />Iniciar Turno
                </Button>
              </Card>
              <Card>
                <h3 className="text-sm font-bold mb-2">Requisitos</h3>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> Ubicación GPS activa</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> Cámara disponible</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> Verificación biométrica</li>
                </ul>
              </Card>
            </>
          )}
        </div>
      )}

      {step === "geolocation" && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-medium">Obteniendo ubicación GPS...</p>
        </div>
      )}
    </div>
  );
}
