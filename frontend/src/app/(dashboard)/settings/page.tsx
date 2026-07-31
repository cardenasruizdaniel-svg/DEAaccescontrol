"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { db } from "@/lib/db";
import { getQueueStats, clearCompleted } from "@/lib/sync";
import { forceUpdate } from "@/lib/pwa";
import { Palette, Bell, Database, Wifi, Shield, Smartphone, RefreshCw, Loader2, CheckCircle, Info } from "lucide-react";

export default function SettingsPage() {
  const online = useOnlineStatus();
  const [notifications, setNotifications] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>("idle");
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0, completed: 0, inProgress: 0 });
  const [cacheSize, setCacheSize] = useState("—");

  useEffect(() => {
    loadStats();
    estimateCacheSize();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch {}
  };

  const estimateCacheSize = async () => {
    try {
      const stores = ["shifts", "schedules", "visits", "payroll", "photos", "attendance"];
      let total = 0;
      for (const store of stores) {
        const count = await db.count(store);
        total += count;
      }
      setCacheSize(`${total} registros`);
    } catch { setCacheSize("—"); }
  };

  const handleClearCache = async () => {
    const stores = ["shifts", "schedules", "visits", "payroll", "photos", "pending_photos"];
    for (const store of stores) {
      try { await db.clear(store); } catch {}
    }
    await clearCompleted();
    estimateCacheSize();
    loadStats();
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setTimeout(() => setSyncStatus("completed"), 2000);
    setTimeout(() => setSyncStatus("idle"), 4000);
  };

  const handleClearAllData = async () => {
    const stores = ["sync_queue", "shifts", "schedules", "visits", "photos", "payroll", "profile", "attendance", "pending_photos", "config"];
    for (const store of stores) {
      try { await db.clear(store); } catch {}
    }
    estimateCacheSize();
    loadStats();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Configuración</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" />Apariencia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SettingRow label="Idioma" value="Español (Colombia)" badge="ES-CO" />
          <SettingRow label="Tema" value="Claro / Oscuro" badge="Automático" />
          <SettingRow label="Zona Horaria" value="America/Bogota" badge="UTC-5" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notificaciones</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Notificaciones Push</p><p className="text-xs text-muted-foreground">Alertas de turnos y recordatorios</p></div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Recordatorio de Turno</p><p className="text-xs text-muted-foreground">15 minutos antes del inicio</p></div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Alertas de Geocerca</p><p className="text-xs text-muted-foreground">Al salir del área asignada</p></div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wifi className="h-4 w-4" />Sincronización</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Estado</p>
              <p className="text-xs text-muted-foreground">{online ? "Conectado" : "Sin conexión"}</p>
            </div>
            <Badge variant={online ? "success" : "destructive"}>{online ? "En línea" : "Offline"}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-muted/50"><p className="font-bold">{queueStats.pending}</p><p className="text-muted-foreground">Pendientes</p></div>
            <div className="p-2 rounded bg-muted/50"><p className="font-bold">{queueStats.failed}</p><p className="text-muted-foreground">Fallidos</p></div>
            <div className="p-2 rounded bg-muted/50"><p className="font-bold">{queueStats.completed}</p><p className="text-muted-foreground">Completados</p></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleSync} disabled={syncStatus === "syncing" || !online}>
              {syncStatus === "syncing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {syncStatus === "syncing" ? "Sincronizando..." : syncStatus === "completed" ? "Sincronizado" : "Sincronizar Ahora"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearCompleted}>Limpiar Completados</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />Almacenamiento Local</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SettingRow label="Datos cacheados" value={cacheSize} />
          <SettingRow label="Fotos pendientes" value={String(queueStats.pending)} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleClearCache}>Limpiar Caché</Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={handleClearAllData}>Limpiar Todos los Datos</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" />Aplicación</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SettingRow label="Versión" value="1.0.0" />
          <SettingRow label="Build" value={process.env.NEXT_PUBLIC_BUILD_ID || "development"} />
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={forceUpdate}>
            <RefreshCw className="h-3 w-3" />Buscar Actualizaciones
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span>{value}</span>
        {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
      </div>
    </div>
  );
}
