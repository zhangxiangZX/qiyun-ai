"use client";

import * as React from "react";

/* -------------------------------------------------------------------------- */
/*  useFocusTrap                                                              */
/*  Traps keyboard focus (Tab / Shift+Tab) inside a container element.        */
/*  - On activate: saves current focus, moves focus into container             */
/*  - On deactivate: restores focus to the saved element                       */
/*  - Works inside Shadow DOM (listener on container, not document)           */
/* -------------------------------------------------------------------------- */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

/** Check if an element is visible (not display:none / visibility:hidden / hidden) */
function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
  return true;
}

/** Query all visible focusable elements within a container */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return elements.filter((el) => isVisible(el));
}

export interface UseFocusTrapOptions {
  /** When true, the trap is active */
  active: boolean;
  /** Optional: element to focus first (defaults to first focusable child) */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Called when Escape is pressed (optional — components may handle their own ESC) */
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  options: UseFocusTrapOptions,
): void {
  const { active, initialFocusRef, onEscape } = options;
  const savedFocusRef = React.useRef<HTMLElement | null>(null);
  // Keep latest onEscape in a ref so the effect doesn't re-run on every render
  const onEscapeRef = React.useRef(onEscape);
  onEscapeRef.current = onEscape;

  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Assign to a locally-typed HTMLElement so closures don't lose narrowing
    const el: HTMLElement = container;

    // 1. Save currently focused element for restoration
    savedFocusRef.current = (document.activeElement as HTMLElement) ?? null;

    // 2. Move focus into the container
    const focusTarget =
      initialFocusRef?.current ??
      getFocusableElements(el)[0] ??
      el;

    // Use rAF to ensure DOM is painted before focusing
    const rafId = requestAnimationFrame(() => {
      focusTarget.focus();
      if (!focusTarget.hasAttribute("tabindex") && focusTarget === el) {
        el.setAttribute("tabindex", "-1");
      }
    });

    // 3. Trap Tab key
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onEscapeRef.current) {
        onEscapeRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(el);
      if (focusable.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const target = e.target as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (target === first || !el.contains(target)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (target === last || !el.contains(target)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // Attach to container so it works in Shadow DOM
    el.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("keydown", handleKeyDown);

      // 4. Restore focus to the element that had it before opening
      if (savedFocusRef.current && document.contains(savedFocusRef.current)) {
        savedFocusRef.current.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}
