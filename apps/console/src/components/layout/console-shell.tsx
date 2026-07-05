"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@qiyun/ui";

import { ConsoleTopbar } from "./console-topbar";
import { SidebarNav } from "./sidebar-nav";

export function ConsoleShell({
  children,
  platformRole,
}: {
  children: ReactNode;
  platformRole?: "platform_admin" | null;
}) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";

  return (
    <div className="min-h-dvh bg-[#f6f9ff] text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:h-dvh lg:w-[218px] lg:flex-col">
        <SidebarNav pathname={pathname} variant="sidebar" platformRole={platformRole} />
      </div>

      <div className="min-h-dvh lg:pl-[218px]">
        <ConsoleTopbar pathname={pathname} platformRole={platformRole} />
        <main
          className={cn(
            "console-main-canvas mx-auto w-full pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            isDashboardHome
              ? "max-w-[1450px] px-0 py-0"
              : "max-w-app px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
