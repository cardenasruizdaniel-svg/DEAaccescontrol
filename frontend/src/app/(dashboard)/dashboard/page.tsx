"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Clock, AlertTriangle, DollarSign, Activity, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const companyId = localStorage.getItem("company_id") || "";
        if (companyId) {
          const res = await api.get(`/dashboard?company_id=${companyId}`);
          setData(res.data);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data || {
    employees: { total_active: 0, active_today: 0, absent_today: 0, late_today: 0, on_time_today: 0 },
    hours: { total_worked: 0, total_overtime: 0, average_per_employee: 0 },
    financial: { current_month_cost: 0, cost_per_employee: 0 },
    productivity: { total_shifts: 0, completed: 0, in_progress: 0, absent: 0, completion_rate: 0 },
  };

  const cards = [
    { title: "Empleados Activos", value: stats.employees.total_active, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { title: "En Turno Hoy", value: stats.employees.active_today, icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    { title: "Ausentes Hoy", value: stats.employees.absent_today, icon: UserX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    { title: "Horas Trabajadas", value: `${stats.hours.total_worked}h`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
    { title: "Horas Extra", value: `${stats.hours.total_overtime}h`, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
    { title: "Costo Nómina", value: formatCurrency(stats.financial.current_month_cost), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { title: "Retardos Hoy", value: stats.employees.late_today, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
    { title: "Tasa Completado", value: `${stats.productivity.completion_rate}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">Panel de control en tiempo real - DLA Access Enterprise</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          <Activity className="mr-1 h-3 w-3" /> Sistema Activo
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos registros de acceso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.productivity.total_shifts === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin actividad registrada hoy</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm">Turnos programados</span>
                    <Badge variant="secondary">{stats.productivity.total_shifts}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm">Completados</span>
                    <Badge variant="success">{stats.productivity.completed}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm">En progreso</span>
                    <Badge>{stats.productivity.in_progress}</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
            <CardDescription>Costos del período actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">Costo total nómina</span>
                <span className="font-semibold">{formatCurrency(stats.financial.current_month_cost)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">Costo promedio/empleado</span>
                <span className="font-semibold">{formatCurrency(stats.financial.cost_per_employee)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">Horas promedio/empleado</span>
                <span className="font-semibold">{stats.hours.average_per_employee}h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
