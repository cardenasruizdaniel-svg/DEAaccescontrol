"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Clock, Settings, Save, Loader2, Pencil, Plus, Trash2, Navigation, Power } from "lucide-react";

const typeLabels: Record<string, string> = { enterprise: "Empresa", individual: "Persona Natural", project: "Proyecto", ips: "IPS", hospital: "Hospital", clinic: "Clinica" };

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactType, setNewContactType] = useState("email");
  const [newContactValue, setNewContactValue] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const loadClient = useCallback(async () => {
    try {
      const [cRes, locRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/clients/${id}/locations`).catch(() => ({ data: [] })),
      ]);
      setClient(cRes.data);
      setForm({
        name: cRes.data.name || "", trade_name: cRes.data.trade_name || "",
        client_type: cRes.data.client_type || "enterprise",
        nit: cRes.data.nit || "", email: cRes.data.email || "", phone: cRes.data.phone || "",
        mobile: cRes.data.mobile || "", website: cRes.data.website || "",
        address: cRes.data.address || "", city: cRes.data.city || "", department: cRes.data.department || "",
        status: cRes.data.status || "active", geofence_radius: String(cRes.data.geofence_radius || "100"),
        latitude: cRes.data.latitude != null ? String(cRes.data.latitude) : "",
        longitude: cRes.data.longitude != null ? String(cRes.data.longitude) : "",
        notes: cRes.data.notes || "",
      });
      setBranches(Array.isArray(locRes.data) ? locRes.data : locRes.data.items || []);
      try {
        const cRes2 = await api.get(`/clients/${id}/contacts`);
        setContacts(Array.isArray(cRes2.data) ? cRes2.data : cRes2.data.items || []);
      } catch (e: any) { console.error("ClientDetail load contacts error:", e); }
      try {
        const pRes = await api.get(`/clients/${id}/personas`);
        setPersons(Array.isArray(pRes.data?.items) ? pRes.data.items : Array.isArray(pRes.data) ? pRes.data : []);
      } catch (e: any) { console.error("ClientDetail load persons error:", e); }
    } catch (e: any) { console.error("Client load error:", e); router.push("/clients"); }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadClient(); }, [loadClient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (form.geofence_radius) payload.geofence_radius = parseFloat(form.geofence_radius);
      if (form.latitude) payload.latitude = parseFloat(form.latitude);
      else payload.latitude = null;
      if (form.longitude) payload.longitude = parseFloat(form.longitude);
      else payload.longitude = null;
      delete payload.trade_name; // send as-is if present, or keep
      await api.put(`/clients/${id}`, payload);
      setEditing(false);
      loadClient();
    } catch (e: any) { console.error("ClientDetail save error:", e); alert("Error al guardar: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
    setSaving(false);
  };

  const handleStatusToggle = async () => {
    const newStatus = client.status === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "inactivar" : "activar";
    if (!confirm(`Desea ${action} este cliente?`)) return;
    try {
      await api.patch(`/clients/${id}/status`, { status: newStatus });
      loadClient();
    } catch (e: any) { console.error("ClientDetail status error:", e); alert("Error al cambiar estado: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const handleDelete = async () => {
    if (!confirm("Desea eliminar este cliente? Esta accion no se puede deshacer.")) return;
    try {
      await api.delete(`/clients/${id}`);
      router.push("/clients");
    } catch (e: any) { console.error("ClientDetail delete error:", e); alert("Error al eliminar: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const addBranch = async () => {
    if (!newBranchName) return;
    try {
      const payload: any = { name: newBranchName, latitude: 0, longitude: 0 };
      if (newBranchAddress) payload.address = newBranchAddress;
      if (client.latitude) payload.latitude = parseFloat(String(client.latitude));
      if (client.longitude) payload.longitude = parseFloat(String(client.longitude));
      await api.post(`/clients/${id}/locations`, payload);
      setNewBranchName("");
      setNewBranchAddress("");
      loadClient();
    } catch (e: any) { console.error("ClientDetail add location error:", e); alert("Error al agregar ubicacion: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const deleteBranch = async (lid: string) => {
    if (!confirm("Desea eliminar esta ubicacion?")) return;
    try { await api.delete(`/clients/${id}/locations/${lid}`); loadClient(); } catch (e: any) { console.error("ClientDetail delete location error:", e); alert("Error al eliminar ubicacion: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const addPerson = async () => {
    if (!newPersonName) return;
    try {
      await api.post(`/clients/${id}/patients`, {
        document_type: "CC", document_number: "0",
        first_name: newPersonName, last_name: "",
      });
      setNewPersonName("");
      loadClient();
    } catch (e: any) { console.error("ClientDetail add patient error:", e); alert("Error al agregar paciente: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const deletePerson = async (pid: string) => {
    if (!confirm("Desea eliminar este paciente?")) return;
    try { await api.delete(`/clients/${id}/patients/${pid}`); loadClient(); } catch (e: any) { console.error("ClientDetail delete patient error:", e); alert("Error al eliminar paciente: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const addContact = async () => {
    if (!newContactValue || !newContactName) return;
    try {
      const payload: any = { full_name: newContactName };
      if (newContactType === "email") payload.email = newContactValue;
      else if (newContactType === "phone") payload.phone = newContactValue;
      else if (newContactType === "mobile") payload.mobile = newContactValue;
      else payload.email = newContactValue;
      await api.post(`/clients/${id}/contacts`, payload);
      setNewContactValue(""); setNewContactName("");
      loadClient();
    } catch (e: any) { console.error("ClientDetail add contact error:", e); alert("Error al agregar contacto: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const deleteContact = async (cid: string) => {
    if (!confirm("Desea eliminar este contacto?")) return;
    try { await api.delete(`/clients/${id}/contacts/${cid}`); loadClient(); } catch (e: any) { console.error("ClientDetail delete contact error:", e); alert("Error al eliminar contacto: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) { alert("Geolocalizacion no disponible"); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev: any) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      (err) => { alert("Error: " + err.message); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Cargando cliente...</div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{typeLabels[client.client_type] || client.client_type}</Badge>
              <Badge variant={client.status === "active" ? "success" : "secondary"}>
                {client.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
              {client.nit && <span className="text-sm text-muted-foreground">NIT: {client.nit}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleStatusToggle}>
            <Power className="mr-2 h-4 w-4" />{client.status === "active" ? "Inactivar" : "Activar"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />Eliminar
          </Button>
          <Button variant={editing ? "outline" : "default"} onClick={() => editing ? setEditing(false) : setEditing(true)}>
            {editing ? "Cancelar" : <><Pencil className="mr-2 h-4 w-4" />Editar</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Datos Generales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1"><label className="text-xs font-medium">Nombre *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Nombre Comercial</label><Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">NIT</label><Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Tipo</label>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Nombre Comercial" value={client.trade_name || "-"} />
                <InfoRow label="NIT" value={client.nit || "-"} />
                <InfoRow label="Tipo" value={typeLabels[client.client_type] || client.client_type} />
                <InfoRow label="Estado" value={client.status === "active" ? "Activo" : "Inactivo"} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" /> Contacto y Ubicacion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1"><label className="text-xs font-medium">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Telefono</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Celular</label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Sitio Web</label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Direccion</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><label className="text-xs font-medium">Ciudad</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Departamento</label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Email" value={client.email || "-"} icon={<Mail className="h-3 w-3" />} />
                <InfoRow label="Telefono" value={client.phone || "-"} icon={<Phone className="h-3 w-3" />} />
                <InfoRow label="Celular" value={client.mobile || "-"} />
                <InfoRow label="Sitio Web" value={client.website || "-"} icon={<Globe className="h-3 w-3" />} />
                <InfoRow label="Direccion" value={client.address || "-"} />
                <InfoRow label="Ciudad" value={`${client.city || "-"}${client.department ? `, ${client.department}` : ""}`} icon={<MapPin className="h-3 w-3" />} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Georreferenciacion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><label className="text-xs font-medium">Latitud</label><Input placeholder="6.2442" value={form.latitude || ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Longitud</label><Input placeholder="-75.5812" value={form.longitude || ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Radio (m)</label><Input type="number" placeholder="200" value={form.geofence_radius} onChange={(e) => setForm({ ...form, geofence_radius: e.target.value })} /></div>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={captureCurrentLocation} disabled={geoLoading}>
                  {geoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
                  {geoLoading ? "Obteniendo ubicacion..." : "Tomar Ubicacion Actual"}
                </Button>
              </>
            ) : (
              <>
                {client.latitude && client.longitude ? (
                  <InfoRow label="Coordenadas" value={`${Number(client.latitude).toFixed(4)}, ${Number(client.longitude).toFixed(4)}`} icon={<MapPin className="h-3 w-3" />} />
                ) : <InfoRow label="Coordenadas" value="No configuradas" />}
                <InfoRow label="Radio Geocerca" value={client.geofence_radius ? `${client.geofence_radius}m` : "No configurado"} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" /> Notas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <div className="space-y-1"><label className="text-xs font-medium">Notas</label><textarea className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            ) : (
              <InfoRow label="Notas" value={client.notes || "Sin notas"} />
            )}
          </CardContent>
        </Card>

        {editing && (
          <div className="col-span-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar Cambios
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Ubicaciones ({branches.length})</span>
            <div className="flex items-center gap-2">
              <Input placeholder="Nombre ubicacion" className="w-48" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
              <Button size="sm" onClick={addBranch} disabled={!newBranchName}><Plus className="h-3 w-3" /></Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? <p className="text-sm text-muted-foreground">Sin ubicaciones registradas</p> : (
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteBranch(b.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Pacientes ({persons.length})</span>
            <div className="flex items-center gap-2">
              <Input placeholder="Nombre" className="w-40" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} />
              <Button size="sm" onClick={addPerson} disabled={!newPersonName}><Plus className="h-3 w-3" /></Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {persons.length === 0 ? <p className="text-sm text-muted-foreground">Sin pacientes registrados</p> : (
            <div className="space-y-2">
              {persons.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{p.first_name} {p.last_name}</p>
                    {p.document_number && <p className="text-xs text-muted-foreground">{p.document_type}: {p.document_number}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deletePerson(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> Contactos ({contacts.length})</span>
            <div className="flex items-center gap-2">
              <Input placeholder="Nombre" className="w-32" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
              <select className="flex h-9 rounded-md border bg-background px-2 text-sm" value={newContactType} onChange={(e) => setNewContactType(e.target.value)}>
                <option value="email">Email</option><option value="phone">Telefono</option><option value="mobile">Celular</option>
              </select>
              <Input placeholder="Valor" className="w-40" value={newContactValue} onChange={(e) => setNewContactValue(e.target.value)} />
              <Button size="sm" onClick={addContact} disabled={!newContactValue || !newContactName}><Plus className="h-3 w-3" /></Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? <p className="text-sm text-muted-foreground">Sin contactos registrados</p> : (
            <div className="space-y-2">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.email && `Email: ${c.email}`}{c.email && c.phone ? " | " : ""}
                      {c.phone && `Tel: ${c.phone}`}{(c.email || c.phone) && c.mobile ? " | " : ""}
                      {c.mobile && `Cel: ${c.mobile}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteContact(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
