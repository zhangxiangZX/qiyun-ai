"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import { cn } from "../lib/utils";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  ToastNotification – matches designs #35(保存成功提示),                    */
/*  #36(系统状态提示/通知堆栈)                                                  */
/*  Usage: <ToastProvider> wraps app; useToast() returns { toast() }           */
/* -------------------------------------------------------------------------- */

// ── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "warning" | "error" | "info";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss duration in ms (0 = manual only) */
  duration?: number;
}

const variantConfig: Record<ToastVariant, {
  icon: React.ComponentType<{ className?: string }>;
  borderClass: string;
  bgClass: string;
  textClass: string;
}> = {
  success: {
    icon: CheckCircle2,
    borderClass: "border-success/30",
    bgClass: "bg-card",
    textClass: "",
  },
  warning: {
    icon: TriangleAlert,
    borderClass: "border-warning/30",
    bgClass: "bg-card",
    textClass: "",
  },
  error: {
    icon: AlertCircle,
    borderClass: "border-destructive/30",
    bgClass: "bg-card",
    textClass: "",
  },
  info: {
    icon: Info,
    borderClass: "border-info/30",
    bgClass: "bg-card",
    textClass: "",
  },
};

const positionClasses: Record<ToastPosition, string> = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

// ── Context ────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

let nextId = 0;

/** Generate a unique toast ID */
function genId(): string {
  nextId += 1;
  return `toast-${nextId}-${Date.now()}`;
}

// ── Provider ───────────────────────────────────────────────────────────────

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Where to render the toast stack (default "top-right") */
  position?: ToastPosition;
  /** Max visible toasts at once (default 5) */
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = "top-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  function addToast(toast: Omit<ToastItem, "id">) {
    const id = genId();
    setToasts((prev) => {
      const next = [...prev, { ...toast, id }];
      // Trim to max
      if (next.length > maxToasts) return next.slice(-maxToasts);
      return next;
    });
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Render portal for toast stack */}
      <ToastStack toasts={toasts} onRemove={removeToast} position={position} />
    </ToastContext.Provider>
  );
}

// ── Stack ──────────────────────────────────────────────────────────────────

interface ToastStackProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  position: ToastPosition;
}

function ToastStack({ toasts, onRemove, position }: ToastStackProps) {
  if (toasts.length === 0 || typeof document === "undefined") return null;

  return (
    <div
      className={cn(
        "fixed z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none animate-fade-in",
        positionClasses[position],
      )}
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

// ── Single Toast Card ─────────────────────────────────────────────────────

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;
  const duration = toast.duration ?? (toast.variant === "error" ? 8000 : 4000);

  React.useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-dialog border bg-card p-4 shadow-lg animate-slide-in-down",
        config.borderClass,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.textClass || `text-${toast.variant}`)} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium leading-snug text-card-foreground">
            {toast.title}
          </p>
          {toast.description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={onClose}
          aria-label="关闭通知"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      {duration > 0 ? (
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-current opacity-20"
            style={{
              animation: `toast-shrink ${duration}ms linear forwards`,
              color: `var(--${toast.variant})`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

// ── Success Dialog Toast (design #35: centered modal with big checkmark) ───

export interface SuccessDialogToastProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onClose: () => void;
}

/** Centered success modal with large checkmark — matches design #35 */
export function SuccessDialogToast(props: SuccessDialogToastProps) {
  if (!props.open) return null;
  return <SuccessDialogToastInner {...props} />;
}

function SuccessDialogToastInner({
  title = "操作成功",
  message,
  confirmLabel = "我知道了",
  onClose,
}: SuccessDialogToastProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Focus trap: Tab cycling + ESC close + auto-focus + focus restore
  useFocusTrap(containerRef, {
    active: true,
    onEscape: onClose,
  });

  // Close on Enter + lock body scroll
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
    >
      <div
        ref={containerRef}
        className="w-full max-w-sm rounded-dialog border border-border bg-card p-8 shadow-card animate-scale-in text-center"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Large green checkmark circle */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
        {message ? (
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        ) : null}
        <div className="mt-6 flex justify-center">
          <Button onClick={onClose}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
