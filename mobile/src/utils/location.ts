import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

let Location: any = null;
if (!isWeb) {
  try { Location = require("expo-location"); } catch {}
}

export async function getCurrentLocation() {
  if (isWeb || !Location) {
    return { latitude: 4.6486, longitude: -74.0958, accuracy: 10, altitude: 0, speed: 0, heading: 0 };
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permiso de ubicación denegado");
  }
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    altitude: location.coords.altitude,
    speed: location.coords.speed,
    heading: location.coords.heading,
  };
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeofence(
  userLat: number, userLon: number,
  fenceLat: number, fenceLon: number,
  radius: number,
): boolean {
  const distance = haversineDistance(userLat, userLon, fenceLat, fenceLon);
  return distance <= radius;
}
