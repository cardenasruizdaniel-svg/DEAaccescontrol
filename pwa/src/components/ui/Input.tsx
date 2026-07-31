import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label htmlFor={id} className="text-sm font-medium text-text-secondary block">{label}</label>}
    <input
      ref={ref}
      id={id}
      className={cn(
        "w-full h-12 px-4 rounded-xl border-2 border-border bg-surface text-text placeholder:text-text-secondary/50",
        "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
        error && "border-danger focus:border-danger focus:ring-danger/20",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
));
Input.displayName = "Input";
