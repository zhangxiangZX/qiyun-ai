"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function SidebarPlanCard({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();

  return (
    <div className="plan">
      <b>企业版</b>
      <small>联系销售升级更高套餐</small>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          router.push("/dashboard/team");
        }}
      >
        升级套餐
      </button>
    </div>
  );
}
