"use client";
import { useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useBiometric } from "@/hooks/useBiometric";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ShiftCameraProps {
  employeeId: string;
  onVerified: (dataUrl: string) => void;
  onError: (error: string) => void;
  mode: "start" | "end";
}

export function ShiftCamera({ employeeId, onVerified, onError, mode }: ShiftCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<"camera" | "preview" | "verifying" | "result">("camera");
  const [result, setResult] = useState<{ success: boolean; confidence?: number; error?: string } | null>(null);
  const { stream, error: camError, requestCamera, capturePhoto, stopCamera } = useCamera();
  const { verifying, verifyFace, reset } = useBiometric();

  const openCamera = async () => {
    setStep("camera");
    setPhoto(null);
    setResult(null);
    reset();
    const s = await requestCamera("user");
    if (s && videoRef.current) {
      videoRef.current.srcObject = s;
    }
  };

  const capture = async () => {
    if (!videoRef.current) return;
    const cap = await capturePhoto(videoRef.current);
    if (cap) {
      setPhoto(cap.dataUrl);
      stopCamera();
      setStep("preview");
    }
  };

  const verify = async () => {
    if (!photo) return;
    setStep("verifying");
    const res = await verifyFace(employeeId, await fetch(photo).then((r) => r.blob()));
    setResult(res);
    setStep("result");
    if (res.success) {
      onVerified(photo);
    } else {
      onError(res.error || "Verificación fallida");
    }
  };

  const retake = () => {
    setPhoto(null);
    setResult(null);
    reset();
    openCamera();
  };

  if (camError) {
    return (
      <div className="text-center p-4 space-y-2">
        <XCircle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{camError}</p>
        <Button variant="outline" size="sm" onClick={retake}>Reintentar</Button>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <div className="space-y-3">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Button onClick={openCamera} className="gap-2">
                <Camera className="h-4 w-4" />
                Abrir Cámara
              </Button>
            </div>
          )}
        </div>
        {stream && (
          <Button onClick={capture} className="w-full gap-2">
            <Camera className="h-4 w-4" />
            Capturar Fotografía
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Se requiere una fotografía para verificación biométrica {mode === "start" ? "al iniciar" : "al finalizar"} el turno
        </p>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg overflow-hidden">
          <img src={photo!} alt="Preview" className="w-full object-cover" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={retake}>
            <RefreshCw className="h-4 w-4 mr-2" />Repetir
          </Button>
          <Button className="flex-1" onClick={verify} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Verificar
          </Button>
        </div>
      </div>
    );
  }

  if (step === "verifying") {
    return (
      <div className="text-center p-6 space-y-3">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-sm">Verificando identidad...</p>
        <p className="text-xs text-muted-foreground">Comparando fotografía con registro biométrico</p>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="text-center p-4 space-y-3">
        {result.success ? (
          <>
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="text-sm font-medium text-success">Identidad verificada</p>
            {result.confidence && <p className="text-xs text-muted-foreground">Confianza: {(result.confidence * 100).toFixed(1)}%</p>}
          </>
        ) : (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">Verificación fallida</p>
            <p className="text-xs text-muted-foreground">{result.error}</p>
            <Button variant="outline" size="sm" onClick={retake}>
              <RefreshCw className="h-4 w-4 mr-2" />Reintentar
            </Button>
          </>
        )}
      </div>
    );
  }

  return null;
}
