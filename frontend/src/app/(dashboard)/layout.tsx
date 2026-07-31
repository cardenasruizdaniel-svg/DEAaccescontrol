"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIsMobile } from "@/hooks/useMediaQuery";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { WifiOff, AlertTriangle } from "lucide-react";

function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive text-xs font-medium py-1.5 px-4 border-b border-destructive/20">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Sin conexión — Los cambios se sincronizarán cuando recupere conectividad</span>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="hidden md:flex w-64 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <Skeleton className="h-6 w-1/2 md:h-10 md:w-1/3" />
          <Skeleton className="h-48 w-full md:h-64" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <div className="flex h-screen items-center justify-center text-muted-foreground">Redirigiendo al inicio de sesión...</div>;

  return (
    <div className="flex h-screen overflow-hidden">
      {!isMobile && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30 pb-20 md:pb-6">
          {children}
        </main>
        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}
