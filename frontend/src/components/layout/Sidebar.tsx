"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useIsMobile } from "@/hooks/useMediaQuery";
import {
  LayoutDashboard, Users, FileText, DollarSign,
  Calendar, MapPin, Camera, Shield, BarChart3, Bot, Settings,
  Building2, ShieldCheck, PlayCircle, Wallet, User,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mi Programación", href: "/my-scheduling", icon: Calendar, mobile: true },
  { label: "Mi Turno", href: "/shift", icon: PlayCircle, mobile: true },
  { label: "Mi Nómina", href: "/payroll", icon: Wallet, mobile: true },
  { label: "Mi Perfil", href: "/profile", icon: User, mobile: true },
  { label: "Empleados", href: "/employees", icon: Users },
  { label: "Contratos", href: "/contracts", icon: FileText },
  { label: "Clientes", href: "/clients", icon: Building2 },
  { label: "Programación Admin", href: "/scheduling", icon: Shield },
  { label: "Geolocalización", href: "/geolocation", icon: MapPin },
  { label: "Acceso", href: "/access-control", icon: ShieldCheck },
  { label: "Roles", href: "/iam/roles", icon: ShieldCheck },
  { label: "Reconocimiento", href: "/facial-recognition", icon: Camera },
  { label: "Reportes", href: "/reports", icon: BarChart3 },
  { label: "Asistente IA", href: "/ai-assistant", icon: Bot },
  { label: "Ayuda", href: "/help", icon: Settings, mobile: true },
  { label: "Configuración", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const isMobile = useIsMobile();

  const show = isMobile ? sidebarOpen : true;
  const width = isMobile ? "w-72" : sidebarOpen ? "w-64" : "w-16";

  const sidebar = (
    <aside className={cn(
      "flex flex-col border-r bg-card h-full transition-all duration-300",
      width,
      isMobile && "fixed left-0 top-0 z-50 shadow-2xl",
    )}>
      {isMobile && (
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              DA
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">DLA Access</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Enterprise</span>
            </div>
          </div>
          <button onClick={toggleSidebar} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      {!isMobile && (
        <div className="flex h-16 items-center border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              DA
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">DLA Access</span>
                <span className="text-[10px] text-muted-foreground leading-tight">Enterprise</span>
              </div>
            )}
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          if (isMobile && !item.mobile && item.label !== "Dashboard" && !item.label.includes("Configuración")) {
            if (item.href.startsWith("/employees") || item.href.startsWith("/contracts") || item.href.startsWith("/clients") || item.href.startsWith("/geolocation") || item.href.startsWith("/access-control") || item.href.startsWith("/iam/") && !item.href.includes("profile") || item.href.startsWith("/facial-recognition") || item.href.startsWith("/reports") || item.href.startsWith("/ai-assistant")) {
              return null;
            }
          }
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { if (isMobile) toggleSidebar(); }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!isMobile && sidebarOpen) || isMobile ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
      {(!isMobile && sidebarOpen) && (
        <div className="border-t p-4">
          <p className="text-[10px] text-muted-foreground text-center">&copy; DLA Redes y Seguridad</p>
        </div>
      )}
    </aside>
  );

  if (!isMobile) return sidebar;

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}
      <div className={cn("fixed inset-y-0 left-0 z-50 transition-transform duration-300", !sidebarOpen && "-translate-x-full")}>
        {sidebar}
      </div>
    </>
  );
}
