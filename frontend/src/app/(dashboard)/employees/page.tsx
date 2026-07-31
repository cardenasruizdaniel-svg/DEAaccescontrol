"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";

const emptyEmployee: Record<string, any> = {
  company_id: "",
  code: "",
  document_type: "CC",
  document_number: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  email: "",
  phone: "",
  mobile: "",
  address: "",
  city: "",
  department_id: "",
  job_position_id: "",
  hire_date: "",
  eps: "",
  arl: "",
  afp: "",
  status: "active",
  create_access: false,
  username: "",
  password: "",
  role_id: "",
  platform_access: "both",
};

function EmployeeForm({ data, onChange, roles, editing }: { data: any; onChange: (d: any) => void; roles?: any[]; editing?: any }) {
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
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Datos del documento</h4>
        <div className="flex gap-3">
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <Select value={data.document_type} onValueChange={(v) => set("document_type", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">Cédula</SelectItem>
                <SelectItem value="TI">Tarjeta Identidad</SelectItem>
                <SelectItem value="CE">Cédula Extranjería</SelectItem>
                <SelectItem value="PA">Pasaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field("Número", "document_number", { required: true })}
          {field("Código", "code", { required: true })}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Información personal</h4>
        <div className="flex gap-3 mb-3">
          {field("Nombres", "first_name", { required: true, half: true })}
          {field("Apellidos", "last_name", { required: true, half: true })}
        </div>
        <div className="flex gap-3 mb-3">
          {field("2do Nombre", "middle_name", { half: true })}
          {field("Email", "email", { half: true, type: "email" })}
        </div>
        <div className="flex gap-3">
          {field("Teléfono", "phone", { half: true })}
          {field("Ciudad", "city", { half: true })}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Información laboral</h4>
        <div className="flex gap-3 mb-3">
          {field("Fecha ingreso", "hire_date", { type: "date", half: true })}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <Select value={data.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="terminated">Retirado</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          {field("EPS", "eps", { half: true })}
          {field("ARL", "arl", { half: true })}
        </div>
      </div>
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Acceso al Sistema</h4>
          {editing && editing.has_access && (
            <Badge variant="default" className="text-xs">
              Cuenta activa - {editing.username}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Usuario {!editing && "*"}</label>
            <Input
              placeholder="nombre.usuario"
              value={data.username || ""}
              onChange={(e) => set("username", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {editing && editing.has_access ? "Nueva Contraseña (vacío = mantener)" : "Contraseña *"}
            </label>
            <Input
              type="password"
              placeholder={editing && editing.has_access ? "Dejar vacío si no desea cambiar" : "Mínimo 8 caracteres"}
              value={data.password || ""}
              onChange={(e) => set("password", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rol / Perfil</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.role_id || ""}
              onChange={(e) => set("role_id", e.target.value)}
            >
              <option value="">Sin rol asignado</option>
              {(roles || []).map((r: any) => <option key={r.id} value={r.id}>{r.display_name || r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Acceso a Plataforma</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={data.platform_access || "both"}
              onChange={(e) => set("platform_access", e.target.value)}
            >
              <option value="both">Web y App</option>
              <option value="web">Solo Web (ERP)</option>
              <option value="mobile">Solo App Móvil</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, terminated: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyEmployee });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [existingAccess, setExistingAccess] = useState(false);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "" : "";

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/employees`, { params: { company_id: companyId, search, page_size: 100 } });
      setEmployees(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setEmployees([]);
    }
    setLoading(false);
  }, [companyId, search]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get(`/employees/stats/summary`, { params: { company_id: companyId } });
      setStats(res.data);
    } catch {}
  }, [companyId]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await api.get(`/iam/roles`);
      setRoles(res.data.items || res.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadEmployees(); loadStats(); loadRoles(); }, [loadEmployees, loadStats, loadRoles]);

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setExistingAccess(false);
    setFormData({ ...emptyEmployee, company_id: companyId });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = async (emp: any) => {
    setEditMode(true);
    setEditId(emp.id);
    setError("");
    try {
      const res = await api.get(`/employees/${emp.id}`);
      const d = res.data;
      setExistingAccess(d.has_access || false);
      setFormData({
        code: d.code || "",
        document_type: d.document_type || "CC",
        document_number: d.document_number || "",
        first_name: d.first_name || "",
        last_name: d.last_name || "",
        middle_name: d.middle_name || "",
        email: d.email || "",
        phone: d.phone || "",
        mobile: d.mobile || "",
        address: d.address || "",
        city: d.city || "",
        department_id: d.department_id || "",
        job_position_id: d.job_position_id || "",
        hire_date: d.hire_date || "",
        eps: d.eps || "",
        arl: d.arl || "",
        afp: d.afp || "",
        status: d.status || "active",
        create_access: d.has_access || false,
        username: d.username || "",
        password: "",
        role_id: d.role_id || "",
        platform_access: d.platform_access || "both",
      });
    } catch {
      setFormData({ ...emptyEmployee, company_id: companyId });
    }
    setDialogOpen(true);
  };

  const openView = async (emp: any) => {
    try {
      const res = await api.get(`/employees/${emp.id}`);
      setViewData(res.data);
      setViewOpen(true);
    } catch {}
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.document_number || !formData.code) {
      setError("Nombre, apellido, documento y código son obligatorios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editMode && editId) {
        const { create_access, username, password, role_id, platform_access, ...empData } = formData;
        await api.put(`/employees/${editId}`, empData);
        if (existingAccess) {
          if (formData.username || formData.password || formData.role_id || formData.platform_access !== "both") {
            await api.put(`/employees/${editId}/access`, {
              ...(formData.username ? { username: formData.username } : {}),
              ...(formData.password ? { password: formData.password } : {}),
              ...(formData.role_id ? { role_id: formData.role_id } : {}),
              platform_access: formData.platform_access || "both",
            });
          }
        } else if (formData.username && formData.password) {
          await api.post(`/employees/${editId}/access`, {
            username: formData.username,
            password: formData.password,
            role_id: formData.role_id || null,
            platform_access: formData.platform_access || "both",
          });
        }
      } else {
        const { create_access, ...payload } = formData;
        payload.company_id = companyId;
        await api.post(`/employees`, payload);
      }
      setDialogOpen(false);
      loadEmployees();
      loadStats();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Error al guardar");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/employees/${deleteId}`);
      setDeleteId(null);
      loadEmployees();
      loadStats();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">{total} registros</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nuevo Empleado</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Activos", value: stats.active, color: "text-green-600" },
          { label: "Inactivos", value: stats.inactive, color: "text-yellow-600" },
          { label: "Retirados", value: stats.terminated, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, documento, código..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No se encontraron empleados</TableCell></TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.code}</TableCell>
                    <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell>{emp.document_type} {emp.document_number}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email || "-"}</TableCell>
                    <TableCell>{emp.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "active" ? "default" : emp.status === "terminated" ? "destructive" : "secondary"}>
                        {emp.status === "active" ? "Activo" : emp.status === "terminated" ? "Retirado" : emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emp.username ? (
                        <Badge variant="default" className="text-[10px]">
                          {emp.username}
                          {emp.platform_access === "both" ? " (Web+App)" : emp.platform_access === "web" ? " (Web)" : " (App)"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin acceso</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(emp)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
          <EmployeeForm data={formData} onChange={setFormData} roles={roles} editing={editMode ? formData : null} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar Empleado</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">¿Está seguro que desea eliminar este empleado? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del Empleado</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Código:</span> <span className="font-medium">{viewData.code}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={viewData.status === "active" ? "default" : "secondary"}>{viewData.status}</Badge></div>
                <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{viewData.first_name} {viewData.middle_name || ""} {viewData.last_name}</span></div>
                <div><span className="text-muted-foreground">Documento:</span> {viewData.document_type} {viewData.document_number}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewData.email || "-"}</div>
                <div><span className="text-muted-foreground">Teléfono:</span> {viewData.phone || "-"}</div>
                <div><span className="text-muted-foreground">Ciudad:</span> {viewData.city || "-"}</div>
                <div><span className="text-muted-foreground">Fecha ingreso:</span> {viewData.hire_date || "-"}</div>
                <div><span className="text-muted-foreground">EPS:</span> {viewData.eps || "-"}</div>
                <div><span className="text-muted-foreground">ARL:</span> {viewData.arl || "-"}</div>
                <div><span className="text-muted-foreground">AFP:</span> {viewData.afp || "-"}</div>
                <div>
                  <span className="text-muted-foreground">Usuario:</span>{" "}
                  {viewData.has_access ? (
                    <Badge variant="default" className="text-xs">{viewData.username} ({viewData.platform_access})</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin acceso</span>
                  )}
                </div>
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
