import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/api/endpoints";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/utils";
import {
  Clock, MapPin, CheckCircle, XCircle,
  AlertCircle, Briefcase, LogIn, LogOut
} from "lucide-react";

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: mobileApi.dashboard,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold">Panel Principal</h1>
        <p className="text-sm text-text-secondary">Bienvenido, {data?.employee_name || "Usuario"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Briefcase className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Turnos Hoy</span>
          </div>
          <p className="text-2xl font-bold">{data?.today_shifts_count || 0}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-warning mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Pendientes</span>
          </div>
          <p className="text-2xl font-bold">{data?.week_pending || 0}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-success mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Completados</span>
          </div>
          <p className="text-2xl font-bold">{data?.week_completed || 0}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-danger mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Auto-Cierres</span>
          </div>
          <p className="text-2xl font-bold">{data?.today_auto_closures || 0}</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-bold mb-3">Registros del Día</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-secondary">
              <LogIn className="h-4 w-4 text-success" />
              <span className="text-sm">Entradas</span>
            </div>
            <span className="font-bold">{data?.today_entries || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-secondary">
              <LogOut className="h-4 w-4 text-danger" />
              <span className="text-sm">Salidas</span>
            </div>
            <span className="font-bold">{data?.today_exits || 0}</span>
          </div>
        </div>
      </Card>

      {data?.today_shifts && data.today_shifts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3">Turnos de Hoy</h3>
          <div className="space-y-2">
            {data.today_shifts.map((s) => (
              <Card key={s.id} className="border-l-4 border-l-primary">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm">{s.client_name || s.name}</p>
                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(s.start_time)} — {formatTime(s.end_time)}</span>
                    </div>
                    {s.client_address && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{s.client_address}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={s.status === "active" ? "success" : s.status === "completed" ? "info" : "warning"}>
                    {s.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
