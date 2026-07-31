import { useState, useCallback, useRef, useEffect } from "react";

interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [supported] = useState("geolocation" in navigator);
  const watchId = useRef<number | null>(null);

  const getCurrentPosition = useCallback(() => {
    if (!supported) {
      setError("Geolocalización no soportada");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => {
        let msg = "Error obteniendo ubicación";
        if (err.code === err.PERMISSION_DENIED) msg = "Permiso denegado";
        else if (err.code === err.TIMEOUT) msg = "Tiempo de espera agotado";
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [supported]);

  const startWatching = useCallback(() => {
    if (!supported) { setError("Geolocalización no soportada"); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => {
        let msg = "Error monitoreando ubicación";
        if (err.code === err.PERMISSION_DENIED) msg = "Permiso denegado";
        else if (err.code === err.TIMEOUT) msg = "Timeout";
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumDistance: 50 } as PositionOptions
    );
    setWatching(true);
  }, [supported]);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setWatching(false);
    }
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const isInsideGeofence = useCallback(
    (centerLat: number, centerLon: number, radiusMeters: number): boolean => {
      if (!position) return false;
      const dist = calculateDistance(position.latitude, position.longitude, centerLat, centerLon);
      return dist <= radiusMeters;
    },
    [position, calculateDistance]
  );

  return { position, error, watching, supported, getCurrentPosition, startWatching, stopWatching, calculateDistance, isInsideGeofence };
}
