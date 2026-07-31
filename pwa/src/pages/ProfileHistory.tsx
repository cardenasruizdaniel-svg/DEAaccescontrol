import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/api/endpoints";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime, formatHours } from "@/lib/utils";
import { Clock, MapPin, LogIn, LogOut } from "lucide-react";

export function ProfileHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["access-history"],
    queryFn: () => mobileApi.accessHistory({ page_size: 50 }),
  });

  const records = data?.items;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Historial de Asistencia</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !records || records.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay registros de asistencia</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm">{formatDate(r.timestamp, "long")}</p>
                <Badge variant={r.record_type === "entry" ? "success" : "danger"}>
                  {r.record_type === "entry" ? "Entrada" : "Salida"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div className="flex items-center gap-1">
                  {r.record_type === "entry" ? (
                    <LogIn className="h-3 w-3 text-success" />
                  ) : (
                    <LogOut className="h-3 w-3 text-danger" />
                  )}
                  <span>{r.record_type === "entry" ? "Entrada" : "Salida"}: {formatTime(r.timestamp)}</span>
                </div>
                {r.inside_geofence !== undefined && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{r.inside_geofence ? "En zona" : "Fuera de zona"}</span>
                  </div>
                )}
              </div>
              {r.worked_hours !== undefined && r.worked_hours > 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-primary font-medium">Horas: {formatHours(r.worked_hours)}</span>
                  {(r.overtime_hours ?? 0) > 0 && (
                    <span className="text-warning font-medium">Extra: {formatHours(r.overtime_hours ?? 0)}</span>
                  )}
                </div>
              )}
              {r.face_verified && (
                <p className="text-xs text-success mt-1">Verificación biométrica ✓</p>
              )}
              {r.auto_closed && (
                <p className="text-xs text-warning mt-1">Cierre automático</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
