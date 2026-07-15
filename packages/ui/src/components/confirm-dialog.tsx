"use client";

import { useEffect, useRef, type ReactNode } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react";

import { Button } from "./button";
import { cn } from "../lib/utils";
import { useFocusTrap } from "../hooks/use-focus-trap";

/* -------------------------------------------------------------------------- */
/*  Enhanced ConfirmDialog – matches designs #18(停用), #22(发布确认),       */
/*  #23(停用确认), #28(禁用成员), #30(重置密码)                               */
/* -------------------------------------------------------------------------- */

export type ConfirmDialogIcon = "warning" | "danger" | "success" | "info" | "none";
export type ConfirmDialogSize = "sm" | "md" | "lg";

const iconMap: Record<Exclude<ConfirmDialogIcon, "none">, React.ComponentType<{ className?: string }>> = {
  warning: TriangleAlert,
  danger: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const iconColorMap: Record<ConfirmDialogIcon, string> = {
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
  info: "text-info",
  none: "",
};

const sizeMap: Record<ConfirmDialogSize, { container: string; titleSize: string; descSize: string }> = {
  sm: { container: "max-w-sm p-5", titleSize: "text-base", descSize: "text-xs" },
  md: { container: "max-w-md p-6", titleSize: "text-lg", descSize: "text-sm" },
  lg: { container: "max-w-lg p-6", titleSize: "text-xl", descSize: "text-base" },
};

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Icon shown left of the description (default "none") */
  icon?: ConfirmDialogIcon;
  /** Modal width variant (default "md") */
  size?: ConfirmDialogSize;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  className?: string;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null;
  return <ConfirmDialogInner {...props} />;
}

function ConfirmDialogInner({
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  icon = "none",
  size = "md",
  confirmLoading = false,
  onConfirm,
  onCancel,
  children,
  className,
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus trap: Tab cycling + ESC close + auto-focus + focus restore
  useFocusTrap(containerRef, {
    active: true,
    onEscape: onCancel,
  });

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const s = sizeMap[size];
  const IconComponent = icon !== "none" ? iconMap[icon] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
    >
      <div
        ref={containerRef}
        className={cn(
          "relative w-full rounded-dialog border border-border bg-card shadow-card animate-scale-in",
          s.container,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className={cn("font-semibold text-card-foreground", s.titleSize)}>{title}</h2>
          {/* Close button */}
          <button
            type="button"
            className="mt-0.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={onCancel}
            aria-label="关闭"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body with optional icon */}
        {(description || children || IconComponent) ? (
          <div className="mt-3">
            {IconComponent ? (
              <div className={cn("mb-3 flex items-start gap-3", iconColorMap[icon])}>
                <IconComponent className="mt-0.5 h-5 w-5 shrink-0" />
              </div>
            ) : null}
            {description ? (
              <p className={cn("leading-relaxed text-muted-foreground", s.descSize)}>
                {description}
              </p>
            ) : null}
            {children ? (
              <div className="mt-3">{children}</div>
            ) : null}
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            loading={confirmLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
