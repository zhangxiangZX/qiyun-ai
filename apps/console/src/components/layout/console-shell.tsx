"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@qiyun/ui";

import { ConsoleTopbar } from "./console-topbar";
import { SidebarNav } from "./sidebar-nav";

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border lg:bg-card/90 lg:backdrop-blur-xl">
        <SidebarNav pathname={pathname} />
      </div>

      <div className={cn("min-h-dvh", "lg:pl-72")}>
        <ConsoleTopbar pathname={pathname} />
        <main className="mx-auto w-full max-w-app px-4 py-6 sm:px-6 lg:px-page lg:py-8">{children}</main>
      </div>
    </div>
  );
}
