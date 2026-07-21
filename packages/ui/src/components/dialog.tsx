"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "../lib/utils";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  Design tokens extracted from 36 弹框 design references                   */
/*  Container: rounded-dialog border border-border bg-card p-6 shadow-card   */
/*  Backdrop : fixed inset-0 z-50 flex items-center justify-center bg-black/40 */
/*  Header   : text-lg font-semibold + × close (absolute top-right)         */
/*  Footer   : mt-6 flex justify-end gap-2                                   */
/* -------------------------------------------------------------------------- */

// ── Size variants ──────────────────────────────────────────────────────────

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export type DialogSize = keyof typeof sizeClasses;

// ── Context ────────────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean;
  onClose: () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog sub-components must be used inside <Dialog>");
  return ctx;
}

// ── Root ───────────────────────────────────────────────────────────────────

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  size?: DialogSize;
  /** Close when clicking the backdrop (default true) */
  closeOnOverlayClick?: boolean;
  /** Close on Escape key (default true) */
  closeOnEsc?: boolean;
  /** Accessible label for the dialog (when no visible title is linked) */
  "aria-label"?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEsc = true,
  children,
  className,
  ...rest
}: DialogProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Focus trap: Tab cycling + ESC close + auto-focus + focus restore
  useFocusTrap(containerRef, {
    active: open,
    onEscape: closeOnEsc ? onClose : undefined,
  });

  // Lock body scroll when open
  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <DialogContext.Provider value={{ open, onClose }}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-dialog-overlay=""
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
        onClick={handleOverlayClick}
        role="presentation"
      >
        <div
          ref={containerRef}
          className={cn(
            "relative w-full rounded-dialog border border-border bg-white p-6 text-foreground shadow-card opacity-100",
            sizeClasses[size],
            className,
          )}
          role="dialog"
          aria-modal="true"
          aria-label={rest["aria-label"]}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body,
  );
}

// ── Close Button ───────────────────────────────────────────────────────────

export function DialogCloseButton({ className }: { className?: string }) {
  const { onClose } = useDialog();

  return (
    <button
      type="button"
      className={cn(
        "absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      onClick={onClose}
      aria-label="关闭"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Show the × close button (default true) */
  showClose?: boolean;
}

export function DialogHeader({ children, className, showClose = true }: DialogHeaderProps) {
  return (
    <div className={cn("relative", className)}>
      {showClose && <DialogCloseButton />}
      {children}
    </div>
  );
}

// ── Title ──────────────────────────────────────────────────────────────────

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-card-foreground", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

// ── Description ───────────────────────────────────────────────────────────

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("mt-1.5 text-sm text-muted-foreground", className)}
      {...props}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";

// ── Body ───────────────────────────────────────────────────────────────────

export interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable vertical scrolling when content overflows */
  scrollable?: boolean;
}

export const DialogBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, scrollable = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-4", scrollable && "max-h-[60vh] overflow-y-auto", className)}
      {...props}
    />
  ),
);
DialogBody.displayName = "DialogBody";

// ── Footer ─────────────────────────────────────────────────────────────────

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Align buttons to end / center / start / spread (default 'end') */
  align?: "start" | "center" | "end" | "spread";
}

const alignClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  spread: "justify-between",
};

export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, align = "end", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-6 flex items-center gap-2", alignClasses[align], className)}
      {...props}
    />
  ),
);
DialogFooter.displayName = "DialogFooter";

// ── Preset: Confirm Actions ────────────────────────────────────────────────

export interface DialogConfirmActionsProps {
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "warning";
  loading?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const confirmVariantStyles: Record<string, string> = {
  default: "",
  destructive: "",
  warning: "bg-warning text-white hover:bg-warning/90",
};

/** Standard cancel + confirm button pair matching all 36 designs */
export function DialogConfirmActions({
  confirmLabel = "确认",
  cancelLabel = "取消",
  variant = "default",
  loading = false,
  disabled = false,
  onCancel,
  onConfirm,
}: DialogConfirmActionsProps) {
  const { onClose } = useDialog();

  return (
    <>
      <Button variant="outline" onClick={() => { onCancel(); onClose(); }} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={variant === "destructive" ? "destructive" : "default"}
        className={confirmVariantStyles[variant]}
        onClick={onConfirm}
        loading={loading}
        disabled={disabled}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
