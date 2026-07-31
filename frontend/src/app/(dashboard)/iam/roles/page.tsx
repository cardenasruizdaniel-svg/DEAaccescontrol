"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield, Plus, Save, Loader2, Trash2, ChevronDown, ChevronRight, Check, X
} from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Role {
  id: string; name: string; display_name: string | null; description: string | null;
  is_active: boolean; is_system: boolean; level: number; color: string | null;
  icon: string | null; permission_count: number; user_count: number;
}

interface Perm { id: string; module: string; action: string; display_name: string | null; is_active: boolean; }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Perm[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", display_name: "", description: "", level: "50", color: "#2563EB" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.allSettled([
        api.get("/iam/roles"),
        api.get("/iam/permissions"),
      ]);
      if (rolesRes.status === "fulfilled") setRoles(rolesRes.value.data.items || []);
      if (permsRes.status === "fulfilled") setAllPerms(permsRes.value.data.items || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedRole) {
      api.get(`/iam/roles/${selectedRole}/permissions`)
        .then(res => setSelectedPerms(new Set(res.data.permission_ids || [])))
        .catch(() => setSelectedPerms(new Set()));
    }
  }, [selectedRole]);

  const modules = [...new Set(allPerms.map(p => p.module))].sort();
  const actions = [...new Set(allPerms.map(p => p.action))].sort();

  const getPermId = (mod: string, act: string) => {
    const p = allPerms.find(x => x.module === mod && x.action === act);
    return p?.id || null;
  };

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
  };

  const toggleModulePerms = (mod: string) => {
    const modPermIds = actions.map(a => getPermId(mod, a)).filter(Boolean) as string[];
    const allSelected = modPermIds.every(id => selectedPerms.has(id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      modPermIds.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const toggleActionAll = (act: string) => {
    const actPermIds = modules.map(m => getPermId(m, act)).filter(Boolean) as string[];
    const allSelected = actPermIds.every(id => selectedPerms.has(id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      actPermIds.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(`/iam/roles/${selectedRole}/permissions`, {
        permission_ids: Array.from(selectedPerms),
      });
      await loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const createRole = async () => {
    if (!newRole.name) return;
    setSaving(true);
    try {
      await api.post("/iam/roles", {
        name: newRole.name, display_name: newRole.display_name || newRole.name,
        description: newRole.description, level: parseInt(newRole.level), color: newRole.color,
      });
      setCreateDialogOpen(false);
      setNewRole({ name: "", display_name: "", description: "", level: "50", color: "#2563EB" });
      await loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Eliminar este rol?")) return;
    try { await api.delete(`/iam/roles/${roleId}`); await loadData(); } catch (err) { console.error(err); }
  };

  const toggleExpand = (mod: string) => {
    setExpandedModules(prev => { const n = new Set(prev); if (n.has(mod)) n.delete(mod); else n.add(mod); return n; });
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles y Permisos</h1>
          <p className="text-sm text-gray-500">Configuracion de roles y matriz de permisos por modulo</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Rol
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Roles ({roles.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {roles.map(r => (
                <div key={r.id}
                     className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedRole === r.id ? "border-blue-500 bg-blue-50 shadow-sm" : "hover:bg-gray-50"}`}
                     onClick={() => setSelectedRole(r.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />}
                      <div>
                        <p className="font-medium text-sm">{r.display_name || r.name}</p>
                        <p className="text-xs text-gray-500">{r.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{r.level}</Badge>
                      {!r.is_system && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); deleteRole(r.id); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{r.permission_count} permisos</span>
                    <span>{r.user_count} usuarios</span>
                    {r.is_system && <Badge className="bg-blue-100 text-blue-800 text-xs">Sistema</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedRole ? `Permisos: ${selectedRoleData?.display_name || selectedRoleData?.name}` : "Seleccione un rol"}
                  </CardTitle>
                  <CardDescription>
                    {selectedRole ? `${selectedPerms.size} de ${allPerms.length} permisos seleccionados` : "Haga clic en un rol para configurar sus permisos"}
                  </CardDescription>
                </div>
                {selectedRole && (
                  <Button onClick={savePermissions} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedRole ? (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {modules.map(mod => {
                    const expanded = expandedModules.has(mod);
                    const modPermIds = actions.map(a => getPermId(mod, a)).filter(Boolean) as string[];
                    const selectedCount = modPermIds.filter(id => selectedPerms.has(id)).length;
                    const allModSelected = modPermIds.length > 0 && selectedCount === modPermIds.length;
                    const someModSelected = selectedCount > 0 && !allModSelected;
                    return (
                      <div key={mod} className="border rounded-lg">
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(mod)}>
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium text-sm capitalize">{mod.replace(/_/g, " ")}</span>
                            {allModSelected ? <Badge className="bg-green-100 text-green-800 text-xs">Todos</Badge> :
                             someModSelected ? <Badge className="bg-yellow-100 text-yellow-800 text-xs">{selectedCount}/{modPermIds.length}</Badge> :
                             <span className="text-xs text-gray-400">Ninguno</span>}
                          </div>
                          <button className={`w-5 h-5 rounded border flex items-center justify-center ${allModSelected ? "bg-blue-500 border-blue-500" : someModSelected ? "bg-yellow-400 border-yellow-400" : "bg-white border-gray-300"}`}
                                  onClick={e => { e.stopPropagation(); toggleModulePerms(mod); }}>
                            {allModSelected && <Check className="h-3 w-3 text-white" />}
                            {someModSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </button>
                        </div>
                        {expanded && (
                          <div className="border-t p-3 space-y-1">
                            {actions.map(act => {
                              const pid = getPermId(mod, act);
                              const has = pid ? selectedPerms.has(pid) : false;
                              return (
                                <div key={act} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                                  <span className="text-sm capitalize">{act}</span>
                                  <button className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${has ? "bg-green-500 border-green-500" : "bg-white border-gray-300 hover:border-gray-400"}`}
                                          onClick={() => pid && togglePerm(pid)}>
                                    {has && <Check className="h-3 w-3 text-white" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Seleccione un rol para ver y editar sus permisos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Rol</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-sm font-medium">Nombre *</label>
              <Input value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Coordinador" /></div>
            <div><label className="text-sm font-medium">Nombre para mostrar</label>
              <Input value={newRole.display_name} onChange={e => setNewRole(p => ({ ...p, display_name: e.target.value }))} placeholder="Ej: Coordinador General" /></div>
            <div><label className="text-sm font-medium">Descripcion</label>
              <Input value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Nivel</label>
                <Input type="number" value={newRole.level} onChange={e => setNewRole(p => ({ ...p, level: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Color</label>
                <Input type="color" value={newRole.color} onChange={e => setNewRole(p => ({ ...p, color: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={createRole} disabled={!newRole.name || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Crear Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
