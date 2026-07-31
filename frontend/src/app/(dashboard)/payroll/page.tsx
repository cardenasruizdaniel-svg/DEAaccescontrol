"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Download, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_hours: number;
  liquidated_hours: number;
  pending_hours: number;
  total_value: number;
  currency: string;
}

interface PayrollHistory {
  id: string;
  period_name: string;
  payment_date: string;
  status: string;
  total_value: number;
  has_receipt: boolean;
}

export default function MyPayrollPage() {
  const { user, employeeId } = useAuthStore();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [history, setHistory] = useState<PayrollHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eid = employeeId || user?.employee_id || user?.id;

  useEffect(() => {
    if (!eid) return;
    const load = async () => {
      try {
        const [openRes, histRes] = await Promise.allSettled([
          api.get(`/payroll/my-current?employee_id=${eid}`),
          api.get(`/payroll/my-history?employee_id=${eid}&page_size=50`),
        ]);
        if (openRes.status === "fulfilled") setCurrentPeriod(openRes.value.data);
        if (histRes.status === "fulfilled") setHistory(histRes.value.data?.items || histRes.value.data || []);
      } catch { setError("Error al cargar información de nómina"); }
      setLoading(false);
    };
    load();
  }, [eid]);

  const handleDownload = async (payrollId: string) => {
    setDownloading(payrollId);
    try {
      const res = await api.get(`/payroll/${payrollId}/receipt`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante_${payrollId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { setError("Error al descargar comprobante"); }
    setDownloading(null);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Mi Nómina</h1>
      </div>

      {currentPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Nómina Abierta</span>
              <Badge variant={currentPeriod.status === "open" ? "success" : "secondary"}>
                {currentPeriod.status === "open" ? "En proceso" : currentPeriod.status}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {currentPeriod.period_name} ({new Date(currentPeriod.start_date).toLocaleDateString("es-CO")} - {new Date(currentPeriod.end_date).toLocaleDateString("es-CO")})
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Horas Liquidadas</p>
                <p className="text-xl font-bold">{currentPeriod.liquidated_hours}h</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Horas Pendientes</p>
                <p className="text-xl font-bold text-amber-600">{currentPeriod.pending_hours}h</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Horas</p>
                <p className="text-xl font-bold">{currentPeriod.total_hours}h</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <p className="text-xs text-muted-foreground">Valor Acumulado</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(currentPeriod.total_value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentPeriod && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sin nómina abierta en este momento</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Nóminas</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin historial disponible</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">{h.period_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(h.payment_date).toLocaleDateString("es-CO")}</span>
                      <Badge variant={h.status === "paid" ? "success" : "secondary"} className="text-[9px]">
                        {h.status === "paid" ? "Pagado" : h.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(h.total_value)}</span>
                    {h.has_receipt && (
                      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => handleDownload(h.id)} disabled={downloading === h.id}>
                        {downloading === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        Comprobante
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
