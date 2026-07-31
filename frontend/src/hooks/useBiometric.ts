"use client";
import { useState, useCallback } from "react";
import api from "@/lib/api";

interface VerificationResult {
  success: boolean;
  confidence?: number;
  error?: string;
  attemptId?: string;
}

export function useBiometric() {
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);

  const verifyFace = useCallback(async (employeeId: string, photoBlob: Blob): Promise<VerificationResult> => {
    setVerifying(true);
    setLastResult(null);
    try {
      const formData = new FormData();
      formData.append("file", photoBlob, "verification.jpg");
      formData.append("employee_id", employeeId);

      const res = await api.post("/facial-recognition/verify", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      const result: VerificationResult = {
        success: res.data.verified === true,
        confidence: res.data.confidence,
        attemptId: res.data.attempt_id,
      };
      setLastResult(result);
      return result;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const result: VerificationResult = {
        success: false,
        error: axiosErr?.response?.data?.detail || axiosErr?.message || "Error en verificación biométrica",
      };
      setLastResult(result);
      return result;
    } finally {
      setVerifying(false);
    }
  }, []);

  const verifyManual = useCallback(async (employeeId: string, photoDataUrl: string): Promise<VerificationResult> => {
    const res = await fetch(photoDataUrl);
    const blob = await res.blob();
    return verifyFace(employeeId, blob);
  }, [verifyFace]);

  const reset = useCallback(() => setLastResult(null), []);

  return { verifying, lastResult, verifyFace, verifyManual, reset };
}
