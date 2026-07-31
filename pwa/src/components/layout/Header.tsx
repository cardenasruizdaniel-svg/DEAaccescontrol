import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/stores/authStore";
import { Wifi, WifiOff, Bell } from "lucide-react";

export function Header() {
  const online = useOnlineStatus();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="ios-top bg-primary text-white">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">DA</div>
          <div>
            <h1 className="text-sm font-bold leading-tight">DLA Access</h1>
            <p className="text-[10px] text-white/70 leading-tight">{user?.full_name || "Mobile"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {online ? <Wifi className="h-4 w-4 text-white/70" /> : <WifiOff className="h-4 w-4 text-warning" />}
          <Bell className="h-5 w-5 text-white/70" />
        </div>
      </div>
    </header>
  );
}
