"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Eye, Ban } from "lucide-react";

const emptyContract: Record<string, any> = {
  employee_id: "",
  company_id: "",
  contract_type_id: "",
  code: "",
  start_date: "",
  end_date: "",
  salary: "",
  work_scheme: "full_time",
  weekly_hours: 48,
  daily_hours: 8,
  payment_frequency: "monthly",
  transportation_assistance: true,
  health_provider: "",
  pension_provider: "",
  risk_level: "1",
  notes: "",
};

const schemeLabels: Record<string, string> = {
  full_time: "Tiempo Completo", part_time: "Medio Tiempo", hourly: "Por Horas", specific: "Obra Labor",
};

const laborTypeLabels: Record<string, string> = {
  fixed_term: "Término Fijo", indefinite: "Indefinido", specific_work: "Obra/Labor",
  services: "Prestación Servicios", apprenticeship: "Aprendizaje SENA",
};

function ContractForm({ data, onChange, employees, contractTypes, editing }: {
  data: any; onChange: (d: any) => void; employees: any[]; contractTypes: any[]; editing?: any;
}) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  const field = (label: string, key: string, opts?: { type?: string; required?: boolean; half?: boolean }) => (
    <div className={opts?.half ? "flex-1" : "w-full"}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <Input
        type={opts?.type || "text"}
        value={data[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        required={opts?.required}
        className="h-9 text-sm"
      />
    </div>
  );
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Información básica</h4>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Empleado *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.employee_id || ""}
              onChange={(e) => set("employee_id", e.target.value)}
              disabled={!!editing}
            >
              <option value="">Seleccionar empleado...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de contrato *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.contract_type_id || ""}
              onChange={(e) => set("contract_type_id", e.target.value)}
            >
              <option value="">Seleccionar tipo...</option>
              {contractTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name} ({laborTypeLabels[ct.labor_law_type] || ct.labor_law_type})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          {field("Código del contrato *", "code", { required: true, half: true })}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Esquema laboral *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.work_scheme || "full_time"}
              onChange={(e) => set("work_scheme", e.target.value)}
            >
              <option value="full_time">Tiempo Completo</option>
              <option value="part_time">Medio Tiempo</option>
              <option value="hourly">Por Horas</option>
              <option value="specific">Obra o Labor</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fechas y salario</h4>
        <div className="flex gap-3 mb-3">
          {field("Fecha inicio *", "start_date", { type: "date", required: true, half: true })}
          {field("Fecha fin", "end_date", { type: "date", half: true })}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Salario mensual (COP) *</label>
            <Input
              type="number"
              value={data.salary || ""}
              onChange={(e) => set("salary", e.target.value)}
              placeholder="Ej: 1800000"
              className="h-9 text-sm"
            />
          </div>
          {field("Horas semanales", "weekly_hours", { type: "number", half: true })}
          {field("Horas diarias", "daily_hours", { type: "number", half: true })}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Seguridad social y notas</h4>
        <div className="flex gap-3 mb-3">
          {field("EPS", "health_provider", { half: true })}
          {field("Pensión", "pension_provider", { half: true })}
        </div>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nivel de riesgo (ARL)</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.risk_level || "1"}
              onChange={(e) => set("risk_level", e.target.value)}
            >
              <option value="1">Riesgo 1 - Mínimo</option>
              <option value="2">Riesgo 2 - Bajo</option>
              <option value="3">Riesgo 3 - Medio</option>
              <option value="4">Riesgo 4 - Alto</option>
              <option value="5">Riesgo 5 - Máximo</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Auxilio de transporte</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.transportation_assistance ? "true" : "false"}
              onChange={(e) => set("transportation_assistance", e.target.value === "true")}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
          <textarea
            className="flex w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
            value={data.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyContract });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [contractTypes, setContractTypes] = useState<any[]>([]);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "" : "";

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/contracts", { params: { company_id: companyId, search, page_size: 100 } });
      setContracts(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { setContracts([]); }
    setLoading(false);
  }, [companyId, search]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get("/employees", { params: { company_id: companyId, page_size: 100, status: "active" } });
      setEmployees(res.data.items || []);
    } catch {}
  }, [companyId]);

  const loadContractTypes = useCallback(async () => {
    try {
      const res = await api.get("/contracts/types", { params: { company_id: companyId } });
      setContractTypes(res.data || []);
    } catch {}
  }, [companyId]);

  useEffect(() => { loadContracts(); loadEmployees(); loadContractTypes(); }, [loadContracts, loadEmployees, loadContractTypes]);

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ ...emptyContract, company_id: companyId });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = async (c: any) => {
    setEditMode(true);
    setEditId(c.id);
    setError("");
    try {
      const res = await api.get(`/contracts/${c.id}`);
      const d = res.data;
      setFormData({
        employee_id: d.employee_id || "",
        company_id: companyId,
        contract_type_id: d.contract_type_id || "",
        code: d.code || "",
        start_date: d.start_date || "",
        end_date: d.end_date || "",
        salary: d.salary || "",
        work_scheme: d.work_scheme || "full_time",
        weekly_hours: d.weekly_hours || 48,
        daily_hours: d.daily_hours || 8,
        payment_frequency: d.payment_frequency || "monthly",
        transportation_assistance: d.transportation_assistance ?? true,
        health_provider: d.health_provider || "",
        pension_provider: d.pension_provider || "",
        risk_level: d.risk_level || "1",
        notes: d.notes || "",
      });
    } catch {
      setFormData({ ...emptyContract, company_id: companyId });
    }
    setDialogOpen(true);
  };

  const openView = async (c: any) => {
    try {
      const res = await api.get(`/contracts/${c.id}`);
      setViewData(res.data);
      setViewOpen(true);
    } catch {}
  };

  const handleSave = async () => {
    if (!formData.employee_id || !formData.contract_type_id || !formData.code || !formData.start_date || !formData.salary) {
      setError("Empleado, tipo, código, fecha inicio y salario son obligatorios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editMode && editId) {
        await api.put(`/contracts/${editId}`, {
          contract_type_id: formData.contract_type_id,
          code: formData.code,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          salary: Number(formData.salary),
          work_scheme: formData.work_scheme,
          weekly_hours: Number(formData.weekly_hours),
          daily_hours: Number(formData.daily_hours),
          transportation_assistance: formData.transportation_assistance,
          health_provider: formData.health_provider || null,
          pension_provider: formData.pension_provider || null,
          risk_level: formData.risk_level,
          notes: formData.notes || null,
        });
      } else {
        await api.post("/contracts", {
          ...formData,
          employee_id: formData.employee_id,
          salary: Number(formData.salary),
          weekly_hours: Number(formData.weekly_hours),
          daily_hours: Number(formData.daily_hours),
          transportation_assistance: formData.transportation_assistance,
        });
      }
      setDialogOpen(false);
      loadContracts();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Error al guardar");
    }
    setSaving(false);
  };

  const handleTerminate = async () => {
    if (!terminateId || !terminateReason) return;
    try {
      await api.post(`/contracts/${terminateId}/terminate`, { reason: terminateReason });
      setTerminateId(null);
      setTerminateReason("");
      loadContracts();
    } catch {}
  };

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const fixedCount = contracts.filter((c) => c.end_date && c.status === "active").length;
  const terminatedCount = contracts.filter((c) => c.status === "terminated").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">{total} registros</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nuevo Contrato</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Activos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{fixedCount}</p>
          <p className="text-xs text-muted-foreground">A Término Fijo</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{terminatedCount}</p>
          <p className="text-xs text-muted-foreground">Terminados</p>
        </CardContent></Card>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, empleado..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Esquema</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : contracts.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay contratos registrados</TableCell></TableRow>
              ) : (
                contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell className="font-medium">{c.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {contractTypes.find((ct) => ct.id === c.contract_type_id)?.name || c.contract_type_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.start_date}</TableCell>
                    <TableCell className="text-sm">{c.end_date || "Indefinido"}</TableCell>
                    <TableCell className="text-sm">${Number(c.salary).toLocaleString("es-CO")}</TableCell>
                    <TableCell><Badge variant="outline">{schemeLabels[c.work_scheme] || c.work_scheme}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "destructive"}>
                        {c.status === "active" ? "Activo" : "Terminado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(c)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} disabled={c.status !== "active"}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setTerminateId(c.id); setTerminateReason(""); }} disabled={c.status !== "active"}><Ban className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Contrato" : "Nuevo Contrato"}</DialogTitle>
          </DialogHeader>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
          <ContractForm data={formData} onChange={setFormData} employees={employees} contractTypes={contractTypes} editing={editMode ? formData : null} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!terminateId} onOpenChange={(o) => { if (!o) { setTerminateId(null); setTerminateReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Terminar Contrato</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">Ingrese el motivo de la terminación:</p>
          <textarea
            className="flex w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            placeholder="Motivo de terminación..."
          />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={handleTerminate} disabled={!terminateReason}>Terminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del Contrato</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Código:</span> <span className="font-medium">{viewData.code}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={viewData.status === "active" ? "default" : "destructive"}>{viewData.status}</Badge></div>
                <div><span className="text-muted-foreground">Empleado:</span> <span className="font-medium">{viewData.employee_name}</span></div>
                <div><span className="text-muted-foreground">Tipo:</span> {contractTypes.find((ct) => ct.id === viewData.contract_type_id)?.name || viewData.contract_type_id}</div>
                <div><span className="text-muted-foreground">Inicio:</span> {viewData.start_date}</div>
                <div><span className="text-muted-foreground">Fin:</span> {viewData.end_date || "Indefinido"}</div>
                <div><span className="text-muted-foreground">Salario:</span> ${Number(viewData.salary).toLocaleString("es-CO")}</div>
                <div><span className="text-muted-foreground">Esquema:</span> {schemeLabels[viewData.work_scheme] || viewData.work_scheme}</div>
                <div><span className="text-muted-foreground">Horas semanales:</span> {viewData.weekly_hours}h</div>
                <div><span className="text-muted-foreground">Horas diarias:</span> {viewData.daily_hours}h</div>
                <div><span className="text-muted-foreground">Transporte:</span> {viewData.transportation_assistance ? "Sí" : "No"}</div>
                <div><span className="text-muted-foreground">Riesgo ARL:</span> Nivel {viewData.risk_level}</div>
                {viewData.health_provider && <div><span className="text-muted-foreground">EPS:</span> {viewData.health_provider}</div>}
                {viewData.pension_provider && <div><span className="text-muted-foreground">Pensión:</span> {viewData.pension_provider}</div>}
                {viewData.notes && <div className="col-span-2"><span className="text-muted-foreground">Notas:</span> {viewData.notes}</div>}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
