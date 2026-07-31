import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { authApi, mobileApi } from "@/api/endpoints";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  User, Lock, Clock, Calendar, HelpCircle,
  Settings, LogOut, ChevronRight
} from "lucide-react";

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const { data: employee } = useQuery({
    queryKey: ["employee"],
    queryFn: mobileApi.employee,
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) { setPwError("Todos los campos son requeridos"); return; }
    if (newPassword !== confirmPassword) { setPwError("Las contraseñas no coinciden"); return; }
    if (newPassword.length < 6) { setPwError("La contraseña debe tener al menos 6 caracteres"); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch { setPwError("Error al cambiar la contraseña"); }
    finally { setPwLoading(false); }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const menuItems = [
    { icon: Clock, label: "Historial de Asistencia", path: "/profile/history" },
    { icon: Calendar, label: "Historial de Turnos", path: "/shift" },
    { icon: HelpCircle, label: "Ayuda", path: "/help" },
    { icon: Settings, label: "Configuración", path: "/settings" },
  ];

  return (
    <div className="space-y-4 pb-4">
      <Card className="text-center py-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          {employee?.photo_url ? (
            <img src={employee.photo_url} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-primary" />
          )}
        </div>
        <h2 className="font-bold text-lg">{employee?.first_name ? `${employee.first_name} ${employee.last_name}` : user?.full_name || "Usuario"}</h2>
        <p className="text-sm text-text-secondary">{employee?.job_position_id || "Empleado"}</p>
        <p className="text-xs text-text-secondary mt-1">{user?.email}</p>
        {employee?.phone && <p className="text-xs text-text-secondary">{employee.phone}</p>}
        {employee?.document_number && (
          <p className="text-xs text-text-secondary">
            {employee.document_type || "Doc"}: {employee.document_number}
          </p>
        )}
      </Card>

      <Card>
        <button
          onClick={() => setPwOpen(true)}
          className="w-full flex items-center justify-between p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Cambiar Contraseña</p>
              <p className="text-xs text-text-secondary">Actualiza tu contraseña de acceso</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        </button>
      </Card>

      <div className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-text-secondary" />
              <span className="text-sm">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          </button>
        ))}
      </div>

      <Button variant="danger" onClick={handleLogout} className="mt-4">
        <LogOut className="h-4 w-4 mr-2" />Cerrar Sesión
      </Button>

      <Modal open={pwOpen} onClose={() => { setPwOpen(false); setPwError(""); setPwSuccess(false); }} title="Cambiar Contraseña">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
          {pwError && <p className="text-sm text-danger">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-success">Contraseña actualizada correctamente</p>}
          <Button type="submit" loading={pwLoading}>Cambiar Contraseña</Button>
        </form>
      </Modal>
    </div>
  );
}
