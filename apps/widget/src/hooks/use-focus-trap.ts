import { useEffect, useRef } from "react";

/* -------------------------------------------------------------------------- */
/*  useFocusTrap — lightweight copy for widget IIFE bundle                    */
/*  (widget doesn't import @qiyun/ui to keep bundle small)                   */
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

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
  return true;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return elements.filter((el) => isVisible(el));
}

export interface UseFocusTrapOptions {
  active: boolean;
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  options: UseFocusTrapOptions,
): void {
  const { active, onEscape } = options;
  const savedFocusRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Assign to a locally-typed HTMLElement so closures don't lose narrowing
    const el: HTMLElement = container;

    savedFocusRef.current = (document.activeElement as HTMLElement) ?? null;

    const rafId = requestAnimationFrame(() => {
      const focusable = getFocusableElements(el);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        el.setAttribute("tabindex", "-1");
        el.focus();
      }
    });

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
        if (target === first || !el.contains(target)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (target === last || !el.contains(target)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("keydown", handleKeyDown);
      if (savedFocusRef.current && document.contains(savedFocusRef.current)) {
        savedFocusRef.current.focus();
      }
    };
  }, [active, containerRef]);
}
