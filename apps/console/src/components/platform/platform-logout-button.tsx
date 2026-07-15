"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { logoutWithConsole } from "@/lib/auth/client";

export function PlatformLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutWithConsole();
      router.push("/platform/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
      onClick={() => void handleLogout()}
    >
      {loading ? "退出中…" : "退出登录"}
    </button>
  );
}
