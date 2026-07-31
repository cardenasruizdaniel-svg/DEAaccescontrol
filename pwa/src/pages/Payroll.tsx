import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/api/endpoints";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatHours, formatDate } from "@/lib/utils";
import { DollarSign, Clock, History, FileText } from "lucide-react";

export function PayrollPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["payroll-summary"],
    queryFn: mobileApi.payrollSummary,
  });

  const latest = data?.latest_record;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold">Mi Nómina</h1>
        <p className="text-sm text-text-secondary">Información salarial</p>
      </div>

      {latest && (
        <Card className="bg-gradient-to-br from-primary to-primary-dark text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-semibold">NÓMINA</span>
            </div>
            <Badge variant={latest.status === "open" ? "warning" : latest.status === "closed" ? "info" : "success"}>
              {latest.status === "open" ? "Abierta" : latest.status === "closed" ? "Cerrada" : "Pagada"}
            </Badge>
          </div>
          <p className="text-3xl font-bold mb-1">{formatCurrency(latest.net_pay)}</p>
          <p className="text-sm text-white/70 mb-4">
            {data?.periods?.find((p) => p.id === latest.period_id)?.name || "Período actual"}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold">{formatCurrency(latest.total_earnings)}</p>
              <p className="text-[10px] text-white/70">Devengado</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold">{formatCurrency(latest.total_deductions)}</p>
              <p className="text-[10px] text-white/70">Deducciones</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold">{latest.worked_days}</p>
              <p className="text-[10px] text-white/70">Días</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between"><span className="text-white/70">Salario base</span><span className="font-medium">{formatCurrency(latest.base_salary)}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Horas extra</span><span className="font-medium">{formatHours(latest.overtime_hours)}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Salud</span><span className="font-medium">{formatCurrency(latest.health_deduction)}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Pensión</span><span className="font-medium">{formatCurrency(latest.pension_deduction)}</span></div>
          </div>
        </Card>
      )}

      {data?.periods && data.periods.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <History className="h-4 w-4" /> Períodos de Nómina
          </h3>
          <div className="space-y-2">
            {data.periods.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{p.name}</p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(p.start_date)} — {formatDate(p.end_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.is_closed ? "success" : "warning"}>
                    {p.is_closed ? "Cerrado" : "Abierto"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!latest && (!data?.periods || data.periods.length === 0) && (
        <div className="text-center py-8 text-text-secondary">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No hay información de nómina disponible</p>
        </div>
      )}
    </div>
  );
}
