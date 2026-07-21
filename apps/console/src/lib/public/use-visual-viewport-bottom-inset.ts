"use client";

import { useEffect, useState } from "react";

/**
 * Tracks soft-keyboard overlap via Visual Viewport so fixed/sticky bottom CTAs
 * can lift above the keyboard in WeChat WebView (and iOS Safari).
 */
export function useVisualViewportBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const overlapped = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(Math.round(overlapped));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return inset;
}
