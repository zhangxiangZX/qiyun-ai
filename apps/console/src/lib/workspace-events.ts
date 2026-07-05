"use client";

import { useEffect } from "react";

export const WORKSPACE_CHANGED_EVENT = "qiyun:workspace-changed";

export function notifyWorkspaceChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT));
}

export function useOnWorkspaceChanged(onChanged: () => void): void {
  useEffect(() => {
    const handler = () => onChanged();
    window.addEventListener(WORKSPACE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, handler);
  }, [onChanged]);
}
