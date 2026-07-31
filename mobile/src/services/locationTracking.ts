import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

let Location: any = null;
let TaskManager: any = null;
if (!isWeb) {
  try { Location = require("expo-location"); } catch {}
  try { TaskManager = require("expo-task-manager"); } catch {}
}

import api from "../services/api";
import { offlineDb } from "../services/offlineDb";

const BACKGROUND_LOCATION_TASK = "background-location-task";

let trackingActive = false;
let trackingInterval: ReturnType<typeof setInterval> | null = null;

if (TaskManager && Location) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) return;
    const locations = data?.locations;
    if (!locations || locations.length === 0) return;

    const loc = locations[0];
    if (!loc?.coords) return;

    const payload = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      timestamp: new Date(loc.timestamp).toISOString(),
      activity_type: "tracking",
    };

    try {
      await api.post("/geolocation/location", payload);
    } catch {
      try {
        await offlineDb.addLocation(payload);
      } catch {}
    }
  });
}

export async function startBackgroundTracking(employeeId: string): Promise<boolean> {
  if (isWeb || !Location) return false;
  if (trackingActive) return true;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== "granted") {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return false;
  }

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      deferredUpdatesInterval: 30000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "DLA Access",
        notificationBody: "Rastreando ubicacion durante turno activo",
        notificationColor: "#1E40AF",
      },
    });
    trackingActive = true;
    return true;
  } catch {
    return startForegroundFallback(employeeId);
  }
}

async function startForegroundFallback(employeeId: string): Promise<boolean> {
  if (isWeb || !Location) return false;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return false;

  trackingInterval = setInterval(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const payload = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        timestamp: new Date(loc.timestamp).toISOString(),
        activity_type: "tracking",
      };
      await api.post("/geolocation/location", payload);
    } catch {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await offlineDb.addLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    }
  }, 60000);

  trackingActive = true;
  return true;
}

export async function stopBackgroundTracking(): Promise<void> {
  trackingActive = false;
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (isWeb || !Location || !TaskManager) return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {}
}

export function isTrackingActive(): boolean {
  return trackingActive;
}
