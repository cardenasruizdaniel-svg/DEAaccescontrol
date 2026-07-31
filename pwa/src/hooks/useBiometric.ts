import { useState, useCallback } from "react";
import { biometricApi } from "@/api/endpoints";
import type { BiometricVerification } from "@/types";

export function useBiometric() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<BiometricVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyFace = useCallback(async (photoDataUrl: string): Promise<boolean> => {
    setVerifying(true);
    setError(null);
    setResult(null);
    try {
      const res = await biometricApi.verify(photoDataUrl);
      setResult(res);
      return res.verified;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error en verificación biométrica";
      setError(msg);
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { verifying, result, error, verifyFace, reset };
}
