"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MailPlus, Menu, ShieldCheck } from "lucide-react";
import { Button, ConfirmDialog, Sheet, SheetContent, SheetTrigger } from "@qiyun/ui";

import { logoutWithConsole } from "@/lib/auth/client";
import { memberRoleLabel } from "@/components/team/workspace-access-shared";

import { SidebarNav } from "./sidebar-nav";

export function MobileNav({
  pathname,
  workspaceName,
  userRole,
  platformRole,
}: {
  pathname: string;
  workspaceName?: string | null;
  userRole?: string | null;
  platformRole?: "platform_admin" | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logoutWithConsole();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
      setConfirmSignOutOpen(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border bg-card text-card-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground">
          <Menu className="h-5 w-5" />
          <span className="sr-only">打开导航</span>
        </SheetTrigger>
        <SheetContent className="flex flex-col p-0">
          <div className="border-b border-border/70 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">控制台导航</p>
            <p className="text-xs text-muted-foreground">
              {workspaceName
                ? `${workspaceName}${userRole ? ` · ${memberRoleLabel(userRole)}` : ""}`
                : platformRole === "platform_admin"
                  ? "当前为超级管理员后台"
                  : "选择页面后继续操作"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              variant="drawer"
              platformRole={platformRole}
            />
          </div>
          <div className="border-t border-border/70 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              账户
            </p>
            <div className="grid gap-2">
              {platformRole === "platform_admin" ? (
                <Button asChild variant="outline" size="sm" className="justify-start">
                  <Link href="/dashboard/super-admin" onClick={() => setOpen(false)}>
                    <ShieldCheck className="h-4 w-4" />
                    超级管理员
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="justify-start">
                    <Link href="/dashboard/team" onClick={() => setOpen(false)}>
                      <ShieldCheck className="h-4 w-4" />
                      团队管理
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="justify-start">
                    <Link href="/dashboard/invitations" onClick={() => setOpen(false)}>
                      <MailPlus className="h-4 w-4" />
                      邀请审批
                    </Link>
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="justify-start"
                onClick={() => setConfirmSignOutOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmSignOutOpen}
        title="确认退出登录"
        description="退出后需要重新登录才能继续访问控制台。"
        confirmLabel="退出登录"
        cancelLabel="取消"
        destructive
        confirmLoading={signingOut}
        onCancel={() => setConfirmSignOutOpen(false)}
        onConfirm={() => void handleSignOut()}
      />
    </>
  );
}
