import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-surface rounded-2xl border border-border p-4 shadow-sm",
        onClick && "active:scale-[0.99] transition-transform cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
