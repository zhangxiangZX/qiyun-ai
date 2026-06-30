"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "../lib/utils";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within Sheet");
  }
  return context;
}

export function Sheet({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({
  children,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const { setOpen } = useSheet();
  return (
    <button type={type} className={className} onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

export function SheetContent({
  children,
  side = "left",
  className,
}: {
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  const { open, setOpen } = useSheet();

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close sidebar"
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "absolute top-0 flex h-full w-[min(100vw,20rem)] flex-col border-border bg-card shadow-card",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          onClick={() => setOpen(false)}
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </aside>
    </div>,
    document.body,
  );
}
