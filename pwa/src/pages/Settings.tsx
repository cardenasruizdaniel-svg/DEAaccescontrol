import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { db } from "@/lib/db";
import { getQueueStats, clearCompleted } from "@/lib/sync";
import { api } from "@/api/client";
import {
  Bell, Database, Wifi, Smartphone, RefreshCw,
  Loader2, Sun, Moon, Info, Shield, AlertTriangle, Trash2
} from "lucide-react";

interface ResettableTable {
  name: string;
  description: string;
}

export function SettingsPage() {
  const online = useOnlineStatus();
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme, notificationsEnabled, setNotifications } = useUIStore();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "completed">("idle");
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0, completed: 0, inProgress: 0 });
  const [cacheInfo, setCacheInfo] = useState("—");
  const [adminOpen, setAdminOpen] = useState(false);
  const [tables, setTables] = useState<ResettableTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    estimateCache();
  }, []);

  useEffect(() => {
    if (adminOpen && user?.is_superuser) {
      api.get("/iam/admin/reset-tables-list").then((r) => {
        setTables(r.data.tables);
      }).catch(() => {});
    }
  }, [adminOpen, user]);

  const loadStats = async () => {
    try { setQueueStats(await getQueueStats()); } catch {}
  };

  const estimateCache = async () => {
    try {
      const stores = ["shifts", "schedules", "visits", "payroll", "attendance"];
      let total = 0;
      for (const s of stores) total += await db.count(s);
      setCacheInfo(`${total} registros`);
    } catch { setCacheInfo("—"); }
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setTimeout(() => setSyncStatus("completed"), 2000);
    setTimeout(() => setSyncStatus("idle"), 4000);
  };

  const handleClearCache = async () => {
    for (const s of ["sync_queue", "shifts", "schedules", "visits", "payroll", "pending_photos"]) {
      try { await db.clear(s); } catch {}
    }
    await clearCompleted();
    estimateCache();
    loadStats();
  };

  const toggleTable = (name: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleReset = async () => {
    if (selectedTables.size === 0) return;
    setResetting(true);
    setResetResult(null);
    try {
      const res = await api.post("/iam/admin/reset-tables", { tables: Array.from(selectedTables) });
      setResetResult(res.data.message);
      setSelectedTables(new Set());
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setResetResult(`Error: ${axiosErr?.response?.data?.detail || "Error al restablecer tablas"}`);
    } finally {
      setResetting(false);
    }
  };

  const isAdmin = user?.is_superuser;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Configuración</h1>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-warning" />}
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-text-secondary">{theme === "dark" ? "Oscuro" : "Claro"}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-12 h-6 rounded-full bg-muted transition-colors"
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Notificaciones Push</p>
              <p className="text-xs text-text-secondary">Alertas de turnos y recordatorios</p>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notificationsEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${notificationsEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" /> Sincronización
        </h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary">Estado</span>
          <Badge variant={online ? "success" : "danger"}>{online ? "En línea" : "Offline"}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-xl bg-muted text-center">
            <p className="font-bold text-sm">{queueStats.pending}</p>
            <p className="text-[10px] text-text-secondary">Pendientes</p>
          </div>
          <div className="p-2 rounded-xl bg-muted text-center">
            <p className="font-bold text-sm">{queueStats.failed}</p>
            <p className="text-[10px] text-text-secondary">Fallidos</p>
          </div>
          <div className="p-2 rounded-xl bg-muted text-center">
            <p className="font-bold text-sm">{queueStats.completed}</p>
            <p className="text-[10px] text-text-secondary">Completados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleSync} disabled={syncStatus === "syncing" || !online}>
            {syncStatus === "syncing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncStatus === "syncing" ? "Sincronizando..." : "Sincronizar"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearCompleted}>Limpiar</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" /> Almacenamiento Local
        </h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary">Datos cacheados</span>
          <span className="text-sm font-medium">{cacheInfo}</span>
        </div>
        <Button variant="outline" onClick={handleClearCache}>Limpiar Caché</Button>
      </Card>

      {isAdmin && (
        <Card className="border-2 border-danger/30">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-5 w-5 text-danger" />
            <div>
              <p className="text-sm font-bold text-danger">Administrador</p>
              <p className="text-xs text-text-secondary">Herramientas de administración del sistema</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => setAdminOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />Restablecer Tablas del Sistema
          </Button>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" /> Aplicación
        </h3>
        <div className="space-y-1 text-xs text-text-secondary">
          <p>Versión: 1.0.0</p>
          <p>Build: {import.meta.env.MODE}</p>
        </div>
      </Card>

      <Modal open={adminOpen} onClose={() => { setAdminOpen(false); setResetResult(null); }} title="Restablecer Tablas">
        <div className="space-y-4">
          {resetResult && (
            <div className={`p-3 rounded-xl text-sm ${resetResult.startsWith("Error") ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
              {resetResult}
            </div>
          )}

          {!resetResult && (
            <>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 text-warning text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Esta acción eliminará datos permanentemente</p>
                  <p className="text-xs mt-1">Selecciona las tablas transaccionales que deseas restablecer. Las tablas del sistema (empleados, usuarios, clientes, etc.) están protegidas.</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {tables.map((t) => (
                  <label key={t.name} className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTables.has(t.name)}
                      onChange={() => toggleTable(t.name)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-text-secondary">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <Button
                variant="danger"
                onClick={handleReset}
                disabled={selectedTables.size === 0 || resetting}
                loading={resetting}
              >
                <Trash2 className="h-4 w-4 mr-2" />Restablecer ({selectedTables.size}) tablas
              </Button>
            </>
          )}

          {resetResult && (
            <Button variant="outline" onClick={() => { setAdminOpen(false); setResetResult(null); }}>
              Cerrar
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
