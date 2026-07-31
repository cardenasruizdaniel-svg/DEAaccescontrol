"use client";
import { useState, useCallback } from "react";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/sync";

interface CameraOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface CaptureResult {
  dataUrl: string;
  blob: Blob;
  file: File;
}

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(navigator.mediaDevices?.getUserMedia);
  });

  const requestCamera = useCallback(async (facingMode: "user" | "environment" = "environment"): Promise<MediaStream | null> => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Permiso de cámara denegado. Habilítelo en los ajustes del dispositivo."
        : "No se pudo acceder a la cámara. Verifique los permisos.";
      setError(msg);
      return null;
    }
  }, [stream]);

  const capturePhoto = useCallback(async (video: HTMLVideoElement, options: CameraOptions = {}): Promise<CaptureResult | null> => {
    try {
      const canvas = document.createElement("canvas");
      const { quality = 0.8, maxWidth = 1280, maxHeight = 720 } = options;
      let { videoWidth, videoHeight } = video;
      if (videoWidth > maxWidth) { videoHeight *= maxWidth / videoWidth; videoWidth = maxWidth; }
      if (videoHeight > maxHeight) { videoWidth *= maxHeight / videoHeight; videoHeight = maxHeight; }
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", quality));
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      return { dataUrl, blob, file };
    } catch {
      setError("Error al capturar la fotografía");
      return null;
    }
  }, []);

  const savePhotoOffline = useCallback(async (dataUrl: string, metadata: Record<string, unknown> = {}) => {
    const id = `photo_${Date.now()}`;
    await db.put("pending_photos", { id, dataUrl, metadata, createdAt: new Date().toISOString() });
    await enqueue("photo", "create", { id, metadata });
    return id;
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  return { stream, error, supported, setSupported, requestCamera, capturePhoto, savePhotoOffline, stopCamera };
}
