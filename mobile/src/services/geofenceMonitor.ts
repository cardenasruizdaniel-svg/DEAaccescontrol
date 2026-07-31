import { Platform, Alert } from "react-native";
import { Geofence } from "../types";
import { haversineDistance } from "../utils/location";
import { offlineDb } from "./offlineDb";

const isWeb = Platform.OS === "web";

let Location: any = null;
if (!isWeb) {
  try { Location = require("expo-location"); } catch {}
}

import api from "./api";

const GEOFENCE_CHECK_INTERVAL = 15000;

let monitorActive = false;
let monitorInterval: ReturnType<typeof setInterval> | null = null;
let lastKnownState: Record<string, boolean> = {};

export interface GeofenceAlert {
  fence: Geofence;
  event: "entry" | "exit";
  latitude: number;
  longitude: number;
  timestamp: string;
}

type GeofenceAlertCallback = (alert: GeofenceAlert) => void;

let alertCallbacks: GeofenceAlertCallback[] = [];

export function onGeofenceAlert(cb: GeofenceAlertCallback) {
  alertCallbacks.push(cb);
  return () => {
    alertCallbacks = alertCallbacks.filter((c) => c !== cb);
  };
}

function emitAlert(alert: GeofenceAlert) {
  for (const cb of alertCallbacks) {
    try { cb(alert); } catch {}
  }

  if (alert.event === "exit" && alert.fence.alert_on_exit) {
    Alert.alert(
      "Geocerca: Salida detectada",
      `Ha salido de la zona "${alert.fence.name}". Su ubicacion esta siendo registrada.`,
      [{ text: "Entendido" }]
    );
  } else if (alert.event === "entry" && alert.fence.alert_on_entry) {
    Alert.alert(
      "Geocerca: Entrada detectada",
      `Ha ingresado a la zona "${alert.fence.name}".`,
      [{ text: "Entendido" }]
    );
  }
}

export async function startGeofenceMonitoring(): Promise<boolean> {
  if (monitorActive) return true;

  let fences: Geofence[] = [];
  try {
    const authState = (await import("../stores/authStore")).useAuthStore.getState();
    if (authState.companyId) {
      const res = await api.get("/geolocation/geofences", { params: { company_id: authState.companyId } });
      fences = res.data || [];
    }
  } catch {}

  if (fences.length === 0) return false;

  for (const f of fences) {
    lastKnownState[f.id] = false;
  }

  monitorActive = true;

  monitorInterval = setInterval(async () => {
    if (!monitorActive) return;

    let loc: any = null;
    if (isWeb || !Location) {
      try {
        loc = await (await import("../utils/location")).getCurrentLocation();
      } catch {
        return;
      }
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        loc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      } catch {
        return;
      }
    }

    for (const fence of fences) {
      if (!fence.is_active) continue;
      const dist = haversineDistance(loc.latitude, loc.longitude, fence.center_latitude, fence.center_longitude);
      const isInside = dist <= fence.radius;
      const wasInside = lastKnownState[fence.id] ?? false;

      if (wasInside && !isInside) {
        const alert: GeofenceAlert = {
          fence,
          event: "exit",
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: new Date().toISOString(),
        };
        emitAlert(alert);
        try {
          await offlineDb.addRecord({
            id: `geofence_exit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: "location",
            data: { event: "geofence_exit", fence_id: fence.id, fence_name: fence.name, latitude: loc.latitude, longitude: loc.longitude },
            timestamp: alert.timestamp,
          });
        } catch {}
      } else if (!wasInside && isInside) {
        const alert: GeofenceAlert = {
          fence,
          event: "entry",
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: new Date().toISOString(),
        };
        emitAlert(alert);
        try {
          await offlineDb.addRecord({
            id: `geofence_entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: "location",
            data: { event: "geofence_entry", fence_id: fence.id, fence_name: fence.name, latitude: loc.latitude, longitude: loc.longitude },
            timestamp: alert.timestamp,
          });
        } catch {}
      }

      lastKnownState[fence.id] = isInside;
    }
  }, GEOFENCE_CHECK_INTERVAL);

  return true;
}

export function stopGeofenceMonitoring(): void {
  monitorActive = false;
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  lastKnownState = {};
}

export function isGeofenceMonitoringActive(): boolean {
  return monitorActive;
}

export async function refreshGeofences(): Promise<void> {
  if (!monitorActive) return;
  try {
    const authState = (await import("../stores/authStore")).useAuthStore.getState();
    if (authState.companyId) {
      const res = await api.get("/geolocation/geofences", { params: { company_id: authState.companyId } });
      const fences: Geofence[] = res.data || [];
      const newStates: Record<string, boolean> = {};
      for (const f of fences) {
        newStates[f.id] = lastKnownState[f.id] ?? false;
      }
      lastKnownState = newStates;
    }
  } catch {}
}
