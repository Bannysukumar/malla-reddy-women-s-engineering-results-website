import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export function Button({ className, variant = "primary", loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "ghost" && "rounded-btn px-4 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-white",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
