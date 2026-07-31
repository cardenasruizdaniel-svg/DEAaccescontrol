import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

let LocalAuthentication: any = null;
let SecureStore: any = null;
if (!isWeb) {
  try { LocalAuthentication = require("expo-local-authentication"); } catch {}
  try { SecureStore = require("expo-secure-store"); } catch {}
}

const BIOMETRIC_ENABLED_KEY = "dla_biometric_enabled";

export interface BiometricResult {
  success: boolean;
  error?: string;
  hardwareAvailable: boolean;
  biometricType: string | null;
}

export const biometricService = {
  async isHardwareAvailable(): Promise<boolean> {
    if (isWeb || !LocalAuthentication) return false;
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch {
      return false;
    }
  },

  async getBiometricType(): Promise<string | null> {
    if (isWeb || !LocalAuthentication) return null;
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "face";
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "fingerprint";
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "iris";
      return null;
    } catch {
      return null;
    }
  },

  async isEnrolled(): Promise<boolean> {
    if (isWeb || !LocalAuthentication) return false;
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch {
      return false;
    }
  },

  async authenticate(promptMessage?: string): Promise<BiometricResult> {
    if (isWeb || !LocalAuthentication) {
      return { success: false, error: "Not available on web", hardwareAvailable: false, biometricType: null };
    }

    const hardwareAvailable = await this.isHardwareAvailable();
    const biometricType = await this.getBiometricType();

    if (!hardwareAvailable) {
      return { success: false, error: "Biometric hardware not available", hardwareAvailable: false, biometricType: null };
    }

    if (!biometricType) {
      return { success: false, error: "No biometrics enrolled on device", hardwareAvailable: true, biometricType: null };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || "Autenticacion biométrica",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
        fallbackLabel: "Usar PIN",
      });

      return {
        success: result.success,
        error: result.success ? undefined : "Autenticacion cancelada o fallida",
        hardwareAvailable: true,
        biometricType,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Error de autenticacion",
        hardwareAvailable: true,
        biometricType,
      };
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    if (isWeb || !SecureStore) return false;
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return val === "true";
    } catch {
      return false;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    if (isWeb || !SecureStore) return;
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
    } catch {}
  },
};
