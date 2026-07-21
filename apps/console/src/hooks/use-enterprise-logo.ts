"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchAuthSession } from "@/lib/auth/client";
import { unwrapEnvelope } from "@/lib/api/envelope";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

/**
 * 当前企业 Logo（来自 companyProfile.logoUrl）。
 * 用于导出按钮图标、报价预览信头等。
 */
export function useEnterpriseLogo(): string | null {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session) {
        setLogoUrl(null);
        return;
      }
      const active = session.workspaces.find((w) => w.isActive);
      if (!active) {
        setLogoUrl(null);
        return;
      }
      const res = await fetch(`/api/auth/workspaces/${active.id}`, { cache: "no-store" });
      if (!res.ok) {
        setLogoUrl(null);
        return;
      }
      const body = await res.json().catch(() => null);
      const workspace = unwrapEnvelope<{ companyProfile?: Record<string, unknown> | null }>(body);
      const raw = workspace?.companyProfile?.logoUrl;
      setLogoUrl(typeof raw === "string" && raw.trim() ? raw.trim() : null);
    } catch {
      setLogoUrl(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  return logoUrl;
}
