"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ConsoleTopbar } from "./console-topbar";
import { SidebarNav } from "./sidebar-nav";

function ConsoleShellContent({
  children,
  platformRole,
}: {
  children: ReactNode;
  platformRole?: "platform_admin" | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="console-app min-h-dvh"
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
    >
      <div className="console-sidebar-slot hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
        <SidebarNav
          pathname={pathname}
          search={search}
          variant="sidebar"
          platformRole={platformRole}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />
      </div>

      <div className="console-main-slot relative min-h-dvh">
        <ConsoleTopbar pathname={pathname} search={search} platformRole={platformRole} />
        <main id="main-content" className="main console-main-canvas w-full">
          <div className="content w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function ConsoleShell({
  children,
  platformRole,
}: {
  children: ReactNode;
  platformRole?: "platform_admin" | null;
}) {
  return (
    <Suspense fallback={null}>
      <ConsoleShellContent platformRole={platformRole}>{children}</ConsoleShellContent>
    </Suspense>
  );
}
