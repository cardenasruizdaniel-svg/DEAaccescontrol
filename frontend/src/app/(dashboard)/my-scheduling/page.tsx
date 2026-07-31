"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, User, Play, WifiOff } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

interface Visit {
  id: string;
  client_name: string;
  persona_name: string;
  address: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  priority: string;
  observations: string;
  client_lat?: number;
  client_lng?: number;
}

export default function MySchedulingPage() {
  const { user, employeeId } = useAuthStore();
  const online = useOnlineStatus();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const eid = employeeId || user?.employee_id || user?.id;

  useEffect(() => {
    if (!eid) return;
    const loadVisits = async () => {
      setLoading(true);
      try {
        const { start, end } = getDateRange();
        const res = await api.get(`/scheduling/my-schedule?employee_id=${eid}&start_date=${start}&end_date=${end}`);
        setVisits(res.data?.items || res.data || []);
      } catch { setVisits([]); }
      setLoading(false);
    };
    loadVisits();
  }, [currentDate, view, eid]);

  const getDateRange = useCallback(() => {
    const d = currentDate;
    if (view === "day") { const s = toLocalDateStr(d); return { start: s, end: s }; }
    if (view === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d); mon.setDate(diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: toLocalDateStr(mon), end: toLocalDateStr(sun) };
    }
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: toLocalDateStr(first), end: toLocalDateStr(last) };
  }, [currentDate, view]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const openMap = (visit: Visit) => {
    if (visit.client_lat && visit.client_lng) {
      window.open(`https://maps.google.com/maps?daddr=${visit.client_lat},${visit.client_lng}`, "_blank");
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "text-red-600 bg-red-50";
      case "urgent": return "text-orange-600 bg-orange-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-blue-600 bg-blue-50";
    }
  };

  const visitsByDate = useMemo(() => {
    const map: Record<string, Visit[]> = {};
    visits.forEach((v) => {
      const d = v.shift_date;
      if (!map[d]) map[d] = [];
      map[d].push(v);
    });
    Object.values(map).forEach((v) => v.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [visits]);

  const weekDates = useMemo(() => {
    if (view !== "week") return [];
    const d = currentDate;
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return Array.from({ length: 7 }, (_, i) => { const dd = new Date(d); dd.setDate(diff + i); return dd; });
  }, [currentDate, view]);

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const d = currentDate;
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
      const dd = new Date(d.getFullYear(), d.getMonth(), 1 - offset + i);
      return { date: dd, inMonth: dd.getMonth() === d.getMonth() };
    });
  }, [currentDate, view]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {!online && (
        <div className="flex items-center gap-2 p-2 rounded bg-amber-50 text-amber-700 text-xs border border-amber-200">
          <WifiOff className="h-3 w-3" />
          <span>Sin conexión — mostrando datos cacheados</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Mi Programación</h1>
        </div>
        <div className="flex gap-1">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <Button key={v} variant={view === v ? "default" : "ghost"} size="sm" onClick={() => setView(v)} className="text-xs">
              {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium ml-2">
            {view === "day" && currentDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            {view === "week" && `${weekDates[0]?.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} - ${weekDates[6]?.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`}
            {view === "month" && currentDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
          </span>
        </div>
        <Badge variant="secondary">{visits.length} visita(s)</Badge>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando programación...</div>
      ) : (
        <>
          {view === "day" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                {(visitsByDate[toLocalDateStr(currentDate)] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin visitas programadas para hoy</p>
                ) : (
                  visitsByDate[toLocalDateStr(currentDate)].map((v) => <VisitCard key={v.id} visit={v} onOpenMap={openMap} />)
                )}
              </CardContent>
            </Card>
          )}

          {view === "week" && (
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((d) => {
                const ds = toLocalDateStr(d);
                const dayVisits = visitsByDate[ds] || [];
                const isToday = ds === toLocalDateStr();
                return (
                  <Card key={ds} className={`${isToday ? "ring-1 ring-primary" : ""}`}>
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className={`text-xs text-center ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 space-y-1">
                      {dayVisits.length === 0 ? (
                        <p className="text-[9px] text-muted-foreground text-center py-2">—</p>
                      ) : (
                        dayVisits.slice(0, 3).map((v) => (
                          <div key={v.id} className="text-[9px] p-1 rounded bg-primary/5 cursor-pointer hover:bg-primary/10"
                            onClick={() => { setView("day"); setCurrentDate(d); }}>
                            <p className="font-medium truncate">{v.client_name}</p>
                            <p className="text-muted-foreground">{v.start_time?.slice(0, 5)}</p>
                          </div>
                        ))
                      )}
                      {dayVisits.length > 3 && <p className="text-[8px] text-muted-foreground text-center">+{dayVisits.length - 3} más</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {view === "month" && (
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 gap-px bg-border">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                    <div key={d} className="bg-muted p-1 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
                  ))}
                  {monthDays.map(({ date: d, inMonth }, i) => {
                    const ds = toLocalDateStr(d);
                    const dayVisits = visitsByDate[ds] || [];
                    const isToday = ds === toLocalDateStr();
                    return (
                      <div key={i} className={`bg-card p-1 min-h-[60px] ${isToday ? "ring-1 ring-primary" : ""} ${!inMonth ? "opacity-30" : ""}`}>
                        <span className={`text-[10px] ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>{d.getDate()}</span>
                        {dayVisits.slice(0, 2).map((v) => (
                          <div key={v.id} className="text-[8px] truncate rounded px-0.5 bg-primary/10 mt-0.5">{v.client_name}</div>
                        ))}
                        {dayVisits.length > 2 && <p className="text-[7px] text-muted-foreground">+{dayVisits.length - 2}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.keys(visitsByDate).length > 0 && (view === "day" || view === "week") && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Lista de Visitas</h2>
              {Object.entries(visitsByDate).map(([date, dayVisits]) => (
                <div key={date}>
                  <h3 className="text-xs text-muted-foreground mb-1">
                    {new Date(date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                  </h3>
                  {dayVisits.map((v) => <VisitCard key={v.id} visit={v} onOpenMap={openMap} />)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VisitCard({ visit, onOpenMap }: { visit: Visit; onOpenMap: (v: Visit) => void }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{visit.client_name}</h3>
              <Badge variant="outline" className={`text-[9px] ${visit.priority === "urgent" ? "border-red-300 text-red-600" : ""}`}>
                {visit.priority}
              </Badge>
              <Badge variant="secondary" className="text-[9px]">{visit.status}</Badge>
            </div>
            {visit.persona_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{visit.persona_name}
              </p>
            )}
            {visit.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />{visit.address}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{visit.start_time?.slice(0, 5)} - {visit.end_time?.slice(0, 5)}</span>
            </div>
            {visit.observations && (
              <p className="text-xs text-muted-foreground/70 italic">Obs: {visit.observations}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 ml-2">
            {(visit.client_lat && visit.client_lng) ? (
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenMap(visit)} title="Abrir en mapa">
                <MapPin className="h-4 w-4" />
              </Button>
            ) : null}
            <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => window.location.href = "/shift"}>
              <Play className="h-3 w-3" />Turno
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
