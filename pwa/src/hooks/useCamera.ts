import { useState, useCallback, useRef } from "react";
import { db } from "@/lib/db";

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const requestCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      setStream(s);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setError("No se pudo acceder a la cámara");
    }
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    return dataUrl;
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCapturedPhoto(null);
  }, [stream]);

  const savePhotoOffline = useCallback(async (photoDataUrl: string, relatedId: string) => {
    await db.put("pending_photos", { id: crypto.randomUUID(), photo: photoDataUrl, related_id: relatedId, timestamp: Date.now() });
  }, []);

  return { stream, error, capturedPhoto, videoRef, canvasRef, requestCamera, capturePhoto, stopCamera, savePhotoOffline };
}
