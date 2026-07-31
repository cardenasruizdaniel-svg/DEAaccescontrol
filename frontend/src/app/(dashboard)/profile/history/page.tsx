"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Clock, MapPin, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  entry_time: string;
  exit_time: string | null;
  worked_hours: number | null;
  status: string;
  entry_lat?: number;
  entry_lng?: number;
  exit_lat?: number;
  exit_lng?: number;
}

export default function AttendanceHistoryPage() {
  const { user, employeeId } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const eid = employeeId || user?.employee_id || user?.id;

  useEffect(() => {
    if (!eid) return;
    api.get(`/access/records?employee_id=${eid}&page_size=100`).then((res) => {
      setRecords(res.data?.items || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [eid]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Historial de Asistencia</h1>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sin registros de asistencia</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{new Date(r.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</span>
                      <Badge variant={r.status === "completed" ? "success" : r.status === "in_progress" ? "default" : "secondary"}>
                        {r.status === "completed" ? "Completado" : r.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Entrada: {r.entry_time?.slice(0, 5)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Salida: {r.exit_time?.slice(0, 5) || "—"}</span>
                      {r.worked_hours !== null && <span>Horas: {r.worked_hours.toFixed(1)}h</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
