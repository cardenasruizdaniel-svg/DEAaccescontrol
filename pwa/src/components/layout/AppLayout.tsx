import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "../shared/OfflineBanner";

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <Header />
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
