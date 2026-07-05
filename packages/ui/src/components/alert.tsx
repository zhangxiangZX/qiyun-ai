import type { HTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "../lib/utils";

const variantStyles = {
  error: {
    container: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: AlertCircle,
  },
  success: {
    container: "border-success/30 bg-success/5 text-success",
    icon: CheckCircle2,
  },
  warning: {
    container: "border-warning/30 bg-warning/5 text-warning",
    icon: TriangleAlert,
  },
  info: {
    container: "border-info/30 bg-info/5 text-info",
    icon: Info,
  },
} as const;

export type AlertVariant = keyof typeof variantStyles;

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

export function Alert({ variant = "info", title, className, children, ...props }: AlertProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-card border p-4 text-sm shadow-sm animate-slide-in-down",
        styles.container,
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className="text-foreground/80">{children}</div>
      </div>
    </div>
  );
}
