import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CloudOff } from "lucide-react";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="bg-warning/90 text-white text-center py-1.5 text-xs font-medium flex items-center justify-center gap-1.5">
      <CloudOff className="h-3.5 w-3.5" />
      Sin conexión — Los datos se sincronizarán automáticamente
    </div>
  );
}
