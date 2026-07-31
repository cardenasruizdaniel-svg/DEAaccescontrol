"use client";
import { useState, useCallback, useEffect, useRef } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [supported, setSupported] = useState(() => typeof navigator !== "undefined" && "geolocation" in navigator);
  const watchId = useRef<number | null>(null);

  const getCurrentPosition = useCallback(async (): Promise<GeoPosition | null> => {
    if (!supported) { setError("Geolocalización no soportada en este dispositivo"); return null; }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
        })
      );
      const result: GeoPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      };
      setPosition(result);
      setError(null);
      return result;
    } catch (err) {
      let msg = "Error al obtener ubicación";
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) msg = "Permiso de ubicación denegado";
        else if (err.code === err.TIMEOUT) msg = "Tiempo de espera agotado al obtener ubicación";
        else if (err.code === err.POSITION_UNAVAILABLE) msg = "Ubicación no disponible";
      }
      setError(msg);
      return null;
    }
  }, [supported]);

  const startWatching = useCallback(async (callback?: (pos: GeoPosition) => void) => {
    if (!supported) { setError("Geolocalización no soportada"); return; }
    try {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const result: GeoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          };
          setPosition(result);
          setError(null);
          callback?.(result);
        },
        (err) => {
          let msg = "Error monitoreando ubicación";
          if (err.code === err.PERMISSION_DENIED) msg = "Permiso denegado";
          else if (err.code === err.TIMEOUT) msg = "Timeout";
          setError(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumDistance: 50 } as PositionOptions & { maximumDistance?: number }
      );
      setWatching(true);
    } catch (err) {
      setError("Error al iniciar monitoreo de ubicación");
    }
  }, [supported]);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setWatching(false);
    }
  }, []);

  useEffect(() => { return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }; }, []);

  return { position, error, supported, watching, getCurrentPosition, startWatching, stopWatching };
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeofence(lat: number, lng: number, centerLat: number, centerLng: number, radiusMeters: number): boolean {
  return calculateDistance(lat, lng, centerLat, centerLng) <= radiusMeters;
}
