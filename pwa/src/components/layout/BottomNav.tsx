import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Play, Wallet, User } from "lucide-react";
import { db } from "@/lib/db";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  useEffect(() => {
    db.get<{ key: string; value: string }>("config", "active_shift_id")
      .then((cfg) => setActiveShiftId(cfg?.value || null))
      .catch(() => setActiveShiftId(null));
  }, [location.pathname]);

  const tabs = [
    { path: "/dashboard", icon: Home, label: "Inicio" },
    { path: "/scheduling", icon: Calendar, label: "Agenda" },
    { path: activeShiftId ? `/visit/${activeShiftId}/active` : "/scheduling", icon: Play, label: activeShiftId ? "Turno" : "Turno" },
    { path: "/payroll", icon: Wallet, label: "Nómina" },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="ios-bottom bg-surface border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full active:scale-95 transition-transform"
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-text-secondary/60"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-text-secondary/60"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
