"use client";
import { useEffect, useCallback, useRef, useState } from "react";
import { useGeolocation, calculateDistance, isInsideGeofence } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Navigation } from "lucide-react";

interface GeofenceConfig {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  clientName?: string;
}

export function GeofenceMonitor({ config, onExit }: { config: GeofenceConfig; onExit?: () => void }) {
  const { position, error, watching, startWatching, stopWatching } = useGeolocation();
  const [inside, setInside] = useState(true);
  const [distance, setDistance] = useState(0);
  const warnedRef = useRef(false);

  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, []);

  useEffect(() => {
    if (!position) return;
    const dist = calculateDistance(position.lat, position.lng, config.centerLat, config.centerLng);
    setDistance(dist);
    const isIn = dist <= config.radiusMeters;
    setInside(isIn);

    if (!isIn && !warnedRef.current) {
      warnedRef.current = true;
      onExit?.();
    }
    if (isIn) warnedRef.current = false;
  }, [position, config, onExit]);

  const openInMaps = useCallback(() => {
    const url = `https://maps.google.com/maps?daddr=${config.centerLat},${config.centerLng}`;
    window.open(url, "_blank");
  }, [config]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Geocerca</span>
        </div>
        <Badge variant={inside ? "success" : "destructive"}>
          {inside ? "Dentro del área" : "Fuera del área"}
        </Badge>
      </div>
      {config.clientName && (
        <p className="text-xs text-muted-foreground">Cliente: {config.clientName}</p>
      )}
      {position && (
        <p className="text-xs text-muted-foreground">
          Distancia: {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
          {distance > config.radiusMeters && ` (máx: ${config.radiusMeters}m)`}
        </p>
      )}
      {!inside && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Ha abandonado el área de la geocerca. {distance > 0 && `Distancia actual: ${Math.round(distance)}m.`}</span>
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={openInMaps}>
        <Navigation className="h-3 w-3" />Abrir en Maps
      </Button>
    </div>
  );
}
