import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

let Device: any = null;
let FileSystem: any = null;
if (!isWeb) {
  try { Device = require("expo-device"); } catch {}
  try { FileSystem = require("expo-file-system"); } catch {}
}

interface MockLocationResult {
  isMock: boolean;
  method: string;
}

export async function detectMockLocation(): Promise<MockLocationResult> {
  if (isWeb || Platform.OS !== "android") {
    return { isMock: false, method: isWeb ? "web_unsupported" : "ios_unsupported" };
  }

  try {
    const Location = await import("expo-location");
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const isMock =
      location.mocked ??
      (location as any).isMocked ??
      false;

    if (isMock) {
      return { isMock: true, method: "location_api_flag" };
    }

    return { isMock: false, method: "location_api_flag" };
  } catch {
    return { isMock: false, method: "detection_failed" };
  }
}

export async function getDeviceInfo() {
  if (isWeb) {
    return {
      device_id: "web",
      device_model: "Web Browser",
      device_os: navigator.userAgent || "unknown",
      device_brand: "unknown",
      platform: "web",
    };
  }
  return {
    device_id: Device?.osBuildId || "unknown",
    device_model: Device?.modelName || Device?.modelId || "unknown",
    device_os: `${Device?.osName} ${Device?.osVersion}`,
    device_brand: Device?.brand || "unknown",
    platform: Platform.OS,
  };
}

export async function saveEvidencePhoto(uri: string, shiftId: string, type: "entry" | "exit"): Promise<string | null> {
  if (isWeb || !FileSystem) return null;
  try {
    const fileName = `evidence_${shiftId}_${type}_${Date.now()}.jpg`;
    const directory = FileSystem.documentDirectory + "evidence/";
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    const destUri = directory + fileName;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  } catch {
    return null;
  }
}

export async function getStoredEvidencePhotos(shiftId: string): Promise<string[]> {
  if (isWeb || !FileSystem) return [];
  try {
    const directory = FileSystem.documentDirectory + "evidence/";
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) return [];
    const files = await FileSystem.readDirectoryAsync(directory);
    return files.filter((f: string) => f.includes(shiftId)).map((f: string) => directory + f);
  } catch {
    return [];
  }
}
