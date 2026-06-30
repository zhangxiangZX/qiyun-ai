"use client";

import { ChevronDown, Layers3, Search, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@qiyun/ui";

import { getActiveNavItem } from "@/lib/navigation";
import { MobileNav } from "./mobile-nav";

export function ConsoleTopbar({ pathname }: { pathname: string }) {
  const active = getActiveNavItem(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-page">
        <div className="flex min-w-0 items-center gap-3">
          <div className="lg:hidden">
            <MobileNav pathname={pathname} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Qiyun AI
            </p>
            <h2 className="truncate text-lg font-semibold text-foreground">
              {active?.title ?? "Console"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            <Layers3 className="mr-1.5 h-3.5 w-3.5" />
            workspace
          </Badge>

          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            <Search className="h-4 w-4" />
            Quick search
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <UserRound className="h-4 w-4" />
                Operator
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile settings</DropdownMenuItem>
              <DropdownMenuItem>Team members</DropdownMenuItem>
              <DropdownMenuItem>Workspace switcher</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
