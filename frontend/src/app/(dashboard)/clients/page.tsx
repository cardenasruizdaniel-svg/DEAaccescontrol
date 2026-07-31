"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Search, Building2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  enterprise: "Empresa", individual: "Persona Natural", ips: "IPS", hospital: "Hospital", clinic: "Clinica", project: "Proyecto",
};

const defaultForm = {
  company_id: "", client_type: "enterprise", name: "", nit: "", trade_name: "",
  email: "", phone: "", mobile: "", address: "", city: "", department: "",
  country: "CO", notes: "",
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const loadClients = async () => {
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const res = await api.get(`/clients?company_id=${companyId}&search=${search}`);
      setClients(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, [search]);

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const payload = { ...form, company_id: companyId };
      if (!payload.company_id) {
        alert("No se encontro company_id. Inicie sesion correctamente.");
        setSaving(false);
        return;
      }
      const res = await api.post("/clients", payload);
      setShowCreate(false);
      setForm({ ...defaultForm });
      router.push(`/clients/${res.data.id}`);
    } catch (e: any) {
      console.error("Create client error:", e);
      alert("Error al crear cliente: " + (e?.response?.data?.detail || e?.message || "Error desconocido"));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestion de clientes, IPS, hospitales y proyectos - {total} registros</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Nuevo Cliente</Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)
        ) : clients.length === 0 ? (
          <Card className="col-span-full"><CardContent className="p-12 text-center text-muted-foreground">No se encontraron clientes</CardContent></Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.nit || "Sin NIT"}</p>
                    <p className="text-sm text-muted-foreground">{client.city || "Sin ciudad"}</p>
                  </div>
                  <Badge variant="outline">{typeLabels[client.client_type] || client.client_type}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant={client.status === "active" ? "success" : "secondary"}>
                    {client.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                  <Button variant="ghost" size="sm">Ver detalle</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-xs font-medium">Nombre *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">Nombre Comercial</label><Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">NIT</label><Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">Tipo</label>
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><label className="text-xs font-medium">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Telefono</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium">Direccion</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><label className="text-xs font-medium">Ciudad</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Departamento</label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !form.name}>{saving ? "Guardando..." : "Crear Cliente"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
