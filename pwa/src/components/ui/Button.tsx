import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark disabled:opacity-50",
  secondary: "bg-secondary text-white hover:bg-secondary/80 active:bg-secondary/80",
  outline: "border-2 border-primary text-primary hover:bg-primary/5 active:bg-primary/10",
  ghost: "text-text-secondary hover:bg-muted active:bg-muted",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/90",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 w-full",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";
