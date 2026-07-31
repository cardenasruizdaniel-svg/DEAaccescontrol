"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Mail, Shield, Calendar, Clock, LogOut, Key, History, HelpCircle, Settings2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  if (!user) return null;

  const initials = user.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (pwForm.newPw !== pwForm.confirm) { setPwError("Las contraseñas no coinciden"); return; }
    if (pwForm.newPw.length < 6) { setPwError("La contraseña debe tener al menos 6 caracteres"); return; }
    setPwLoading(true);
    try {
      await api.put("/auth/change-password", { current_password: pwForm.current, new_password: pwForm.newPw });
      setPwSuccess(true);
      setPwForm({ current: "", newPw: "", confirm: "" });
      setTimeout(() => setPwOpen(false), 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setPwError(axiosErr?.response?.data?.detail || "Error al cambiar contraseña");
    }
    setPwLoading(false);
  };

  const menuItems = [
    { icon: Key, label: "Cambiar Contraseña", onClick: () => setPwOpen(true) },
    { icon: History, label: "Historial de Asistencia", href: "/profile/history" },
    { icon: Clock, label: "Mis Turnos", href: "/my-scheduling" },
    { icon: HelpCircle, label: "Ayuda y Soporte", href: "/help" },
    { icon: Settings2, label: "Configuración", href: "/settings" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-20 w-20 md:h-24 md:w-24">
              <AvatarFallback className="bg-primary/10 text-primary text-xl md:text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold">{user.full_name || "Usuario"}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileRow icon={User} label="Nombre" value={user.full_name} />
          <ProfileRow icon={Mail} label="Correo" value={user.email} />
          <ProfileRow icon={Shield} label="Rol" value={user.role_id || "Sin asignar"} />
          <ProfileRow icon={Calendar} label="Miembro desde" value={user.created_at ? new Date(user.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {menuItems.map((item) => (
            <button key={item.label} onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
              className="w-full flex items-center gap-3 p-3 text-sm rounded-lg hover:bg-muted/50 transition-colors text-left">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </button>
          ))}
          <button onClick={() => logout()}
            className="w-full flex items-center gap-3 p-3 text-sm rounded-lg hover:bg-destructive/10 transition-colors text-left text-destructive">
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
        </CardContent>
      </Card>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4" />Cambiar Contraseña</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="text-xs font-medium">Contraseña Actual</label>
              <Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium">Nueva Contraseña</label>
              <Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium">Confirmar Nueva Contraseña</label>
              <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
            {pwError && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" />{pwError}</p>}
            {pwSuccess && <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />Contraseña actualizada correctamente</p>}
            <Button type="submit" className="w-full" disabled={pwLoading}>
              {pwLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar Cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground min-w-20">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
