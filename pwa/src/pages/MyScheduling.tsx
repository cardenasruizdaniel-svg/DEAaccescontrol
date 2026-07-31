import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/api/endpoints";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils";
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, MapPin, Clock, AlertCircle,
  CalendarDays, CalendarRange, List
} from "lucide-react";
import type { Shift } from "@/types";

type ViewMode = "day" | "week" | "month";

export function MySchedulingPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateParams = () => {
    if (view === "day") return { start_date: format(currentDate, "yyyy-MM-dd"), end_date: format(currentDate, "yyyy-MM-dd") };
    if (view === "week") return { start_date: format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd"), end_date: format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    return { start_date: format(startOfMonth(currentDate), "yyyy-MM-dd"), end_date: format(endOfMonth(currentDate), "yyyy-MM-dd") };
  };

  const { data: shifts, isLoading } = useQuery({
    queryKey: ["shifts", view, format(currentDate, "yyyy-MM-dd")],
    queryFn: () => mobileApi.shifts(dateParams()),
  });

  const goToPage = (dir: "prev" | "next") => {
    const delta = dir === "next" ? 1 : -1;
    if (view === "day") setCurrentDate((d) => addDays(d, delta));
    else if (view === "week") setCurrentDate((d) => addDays(d, delta * 7));
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  const title = () => {
    if (view === "day") return format(currentDate, "d 'de' MMMM", { locale: es });
    if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, "d")} — ${format(e, "d MMM", { locale: es })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: es });
  };

  const openInMaps = (lat?: number, lng?: number, address?: string) => {
    const url = lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(address || "")}`;
    window.open(url, "_blank");
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "active": return "info" as const;
      case "in_progress": return "info";
      case "cancelled": return "danger";
      case "pending": return "warning";
      default: return "default";
    }
  };

  const priorityIcon = (p?: string) => {
    if (p === "urgent" || p === "high") return <AlertCircle className="h-4 w-4 text-danger" />;
    return null;
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === v ? "bg-surface text-primary shadow-sm" : "text-text-secondary"
              }`}
            >
              {v === "day" ? <List className="h-4 w-4" /> : v === "week" ? <CalendarDays className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => goToPage("prev")} className="p-2 hover:bg-muted rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-bold capitalize">{title()}</h2>
        <button onClick={() => goToPage("next")} className="p-2 hover:bg-muted rounded-lg">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !shifts || shifts.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay visitas programadas</p>
          <p className="text-sm">Para este período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((s: Shift) => (
            <Card
              key={s.id}
              onClick={() => {
                if (s.status === "active") navigate(`/visit/${s.id}/active`);
                else if (s.status === "pending") navigate(`/scheduling/${s.id}/entry`);
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base">{s.client_name || s.name}</p>
                    {priorityIcon(s.priority)}
                  </div>
                  <p className="text-xs text-text-secondary">{formatDate(s.shift_date)}</p>
                </div>
                <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(s.start_time)} — {formatTime(s.end_time)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.client_address}</span>
              </div>
              {s.observations && <p className="text-xs text-text-secondary bg-muted rounded-lg p-2 mb-3">{s.observations}</p>}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openInMaps(s.client_latitude, s.client_longitude, s.client_address)}
                  className="flex-1 h-9 text-xs font-medium rounded-xl border-2 border-primary text-primary hover:bg-primary/5 active:bg-primary/10 transition-all"
                >
                  Abrir en Maps
                </button>
                {s.status === "pending" && (
                  <button
                    onClick={() => navigate(`/scheduling/${s.id}/entry`)}
                    className="flex-1 h-9 text-xs font-medium rounded-xl bg-primary text-white hover:bg-primary-dark active:bg-primary-dark transition-all"
                  >
                    Iniciar Turno
                  </button>
                )}
                {s.status === "active" && (
                  <button
                    onClick={() => navigate(`/visit/${s.id}/active`)}
                    className="flex-1 h-9 text-xs font-medium rounded-xl bg-success text-white hover:bg-green-700 active:bg-green-700 transition-all"
                  >
                    Ver Turno
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
