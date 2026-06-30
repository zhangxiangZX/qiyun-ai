"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@qiyun/ui";

import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border bg-card text-card-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent className="p-0">
        <SidebarNav pathname={pathname} />
      </SheetContent>
    </Sheet>
  );
}
