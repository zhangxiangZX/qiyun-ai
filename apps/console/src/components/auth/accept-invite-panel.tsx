"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Alert, Badge, Button, EmptyState, Input, Label } from "@qiyun/ui";

import {
  fetchAuthSession,
  loginWithConsole,
  logoutWithConsole,
  registerWithConsole,
  type AuthSession,
} from "@/lib/auth/client";

import {
  InviteStatusBadge,
  WorkspaceAccessPanelSkeleton,
  WorkspaceDetailGrid,
  WorkspaceDetailItem,
  formatWorkspaceDate,
  memberRoleLabel,
} from "../team/workspace-access-shared";

type InviteLookup = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  inviteUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
};

type DeliveryAudit = {
  id: string;
  provider: string;
  attempt: number;
  status: "sent" | "failed";
  startedAt: string;
  finishedAt: string;
  errorMessage: string | null;
};

type LoadStatus = "loading" | "ready" | "error";
type ActionStatus = "idle" | "loading" | "success" | "error";
type AutoAcceptIntent = "none" | "login" | "register";

export function AcceptInvitePanel({ token }: { token: string | null }) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [registerStatus, setRegisterStatus] = useState<ActionStatus>("idle");
  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [audits, setAudits] = useState<DeliveryAudit[]>([]);
  const [autoAcceptIntent, setAutoAcceptIntent] = useState<AutoAcceptIntent>("none");

  useEffect(() => {
    void fetchAuthSession()
      .then((nextSession) => setSession(nextSession))
      .catch(() => setSession(null));
  }, []);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setLoadStatus("error");
      setErrorMessage("邀请链接缺少 token，请向工作区管理员索取新的邀请。");
      return;
    }

    setLoadStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/auth/workspace-invitations/token/${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "无法加载邀请信息。");
      }

      const payload = (await response.json()) as InviteLookup;
      setInvite(payload);
      setLoadStatus("ready");
    } catch (error) {
      setLoadStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "无法加载邀请信息。");
    }
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  useEffect(() => {
    if (!session || !invite) {
      setAudits([]);
      return;
    }

    let mounted = true;
    void fetch(`/api/auth/workspace-invitations/${invite.id}/delivery-audits`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as DeliveryAudit[];
      })
      .then((entries) => {
        if (mounted) setAudits(entries);
      })
      .catch(() => {
        if (mounted) setAudits([]);
      });

    return () => {
      mounted = false;
    };
  }, [invite, session]);

  const handleAccept = useCallback(async () => {
    if (!token || !session) return;

    setActionStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/auth/workspace-invitations/token/${encodeURIComponent(token)}/accept`,
        { method: "POST" },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "无法接受邀请。");
      }

      const payload = (await response.json()) as InviteLookup;
      setInvite(payload);
      setActionStatus("success");
    } catch (error) {
      setActionStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "无法接受邀请。");
    }
  }, [session, token]);

  async function handleRegister() {
    if (!invite) return;

    if (!registerName.trim() || !registerPassword.trim()) {
      setRegisterStatus("error");
      setErrorMessage("请填写姓名和密码。");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterStatus("error");
      setErrorMessage("两次输入的密码不一致。");
      return;
    }

    setRegisterStatus("loading");
    setErrorMessage("");

    try {
      const nextSession = await registerWithConsole({
        email: invite.email,
        password: registerPassword,
        name: registerName.trim(),
        invitationToken: token ?? undefined,
      });
      setAutoAcceptIntent("register");
      setSession(nextSession);
      setRegisterStatus("success");
    } catch (error) {
      setRegisterStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "创建账号失败。");
    }
  }

  async function handleLoginShortcut() {
    if (!invite || !registerPassword.trim()) return;

    setRegisterStatus("loading");
    setErrorMessage("");

    try {
      const nextSession = await loginWithConsole({
        email: invite.email,
        password: registerPassword,
      });
      setAutoAcceptIntent("login");
      setSession(nextSession);
      setRegisterStatus("success");
    } catch (error) {
      setRegisterStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "登录失败。");
    }
  }

  const invitedEmailMatches =
    invite && session ? invite.email.toLowerCase() === session.user.email.toLowerCase() : false;

  useEffect(() => {
    if (
      autoAcceptIntent === "none" ||
      !session ||
      !invite ||
      invite.status !== "pending" ||
      !invitedEmailMatches ||
      actionStatus === "loading" ||
      actionStatus === "success"
    ) {
      return;
    }

    void handleAccept().finally(() => {
      setAutoAcceptIntent("none");
    });
  }, [actionStatus, autoAcceptIntent, handleAccept, invite, invitedEmailMatches, session]);

  if (loadStatus === "loading") {
    return <WorkspaceAccessPanelSkeleton />;
  }

  if (loadStatus === "error") {
    return (
      <div className="w-full max-w-xl rounded-dialog border border-border bg-card p-6 shadow-card sm:p-8">
        <EmptyState
          title="邀请不可用"
          description={errorMessage}
          action={
            token ? (
              <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadInvite()}>
                重新加载
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">返回登录</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="w-full max-w-xl rounded-dialog border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">工作区邀请</Badge>
            <InviteStatusBadge status={invite.status} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              加入 {invite.workspaceName}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              请使用受邀邮箱设置密码并激活账号，完成后即可进入工作区。
            </p>
          </div>
        </div>

        <WorkspaceDetailGrid>
          <WorkspaceDetailItem label="工作区" icon={Users} value={invite.workspaceName} />
          <WorkspaceDetailItem
            label="角色"
            icon={ShieldCheck}
            value={memberRoleLabel(invite.role)}
          />
          <WorkspaceDetailItem label="受邀邮箱" icon={Mail} value={invite.email} />
          <WorkspaceDetailItem
            label="过期时间"
            icon={Clock3}
            value={formatWorkspaceDate(invite.expiresAt)}
          />
        </WorkspaceDetailGrid>

        {invite.status === "accepted" ? (
          <Alert variant="success" title="邀请已接受">
            接受时间 {formatWorkspaceDate(invite.acceptedAt)}。你可以直接进入控制台。
          </Alert>
        ) : null}

        {invite.status === "revoked" ? (
          <Alert variant="warning" title="邀请已撤销">
            该邀请已被工作区管理员撤销，请联系对方重新发送。
          </Alert>
        ) : null}

        {invite.status === "expired" ? (
          <Alert variant="warning" title="邀请已过期">
            该邀请已超过有效期，请联系工作区管理员重新发送。
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="error" title="操作失败">
            {errorMessage}
          </Alert>
        ) : null}

        {session ? (
          <div className="space-y-4 rounded-card border border-border bg-muted/30 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">当前登录账号</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
              <Button
                variant="link"
                className="h-auto px-0"
                onClick={() => {
                  void logoutWithConsole().finally(() => setSession(null));
                }}
              >
                切换账号
              </Button>
            </div>

            {!invitedEmailMatches ? (
              <Alert variant="warning" title="邮箱不匹配">
                请使用 {invite.email} 登录后再接受邀请。
              </Alert>
            ) : null}

            {actionStatus === "success" ? (
              <Alert variant="success" title="邀请已接受">
                你的账号已加入该工作区，可以进入控制台继续配置。
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                onClick={() => void handleAccept()}
                loading={actionStatus === "loading"}
                disabled={
                  invite.status !== "pending" ||
                  !invitedEmailMatches ||
                  actionStatus === "success"
                }
                rightIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                接受邀请
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  进入控制台
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : invite.status === "pending" ? (
          <div className="space-y-4 rounded-card border border-border bg-muted/30 p-4 sm:p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">设置账号密码</p>
              <p className="text-sm text-muted-foreground">
                将使用 <span className="font-medium text-foreground">{invite.email}</span>{" "}
                创建账号并加入 {invite.workspaceName}，不会额外创建个人工作区。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-name">你的姓名</Label>
              <Input
                id="invite-name"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="例如：陈晓"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-password">密码</Label>
              <Input
                id="invite-password"
                type="password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-confirm-password">确认密码</Label>
              <Input
                id="invite-confirm-password"
                type="password"
                value={registerConfirmPassword}
                onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                placeholder="再次输入密码"
              />
            </div>

            {registerStatus === "success" ? (
              <Alert variant="success" title="账号已就绪">
                你已登录，可在上方直接接受邀请。
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                onClick={() => void handleRegister()}
                loading={registerStatus === "loading"}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                创建账号
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleLoginShortcut()}
                loading={registerStatus === "loading"}
              >
                我已有密码
              </Button>
              <Button asChild variant="ghost">
                <Link
                  href={`/login?inviteToken=${encodeURIComponent(token ?? "")}&inviteEmail=${encodeURIComponent(invite.email)}`}
                >
                  使用完整登录页
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-card border border-dashed border-border bg-muted/30 p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">
              请使用 <span className="font-medium text-foreground">{invite.email}</span>{" "}
              登录后查看或确认工作区访问权限。
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link
                href={`/login?inviteToken=${encodeURIComponent(token ?? "")}&inviteEmail=${encodeURIComponent(invite.email)}`}
              >
                前往登录
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {session && audits.length > 0 ? (
          <div className="space-y-3 rounded-card border border-border bg-background/70 p-4">
            <p className="text-sm font-medium text-foreground">最近投递记录</p>
            <div className="space-y-2">
              {audits.slice(0, 3).map((audit) => (
                <div
                  key={audit.id}
                  className="flex items-center justify-between gap-3 rounded-control border border-border/70 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      第 {audit.attempt} 次 · {audit.provider}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      完成于 {formatWorkspaceDate(audit.finishedAt)}
                    </p>
                  </div>
                  <Badge variant={audit.status === "sent" ? "success" : "destructive"}>
                    {audit.status === "sent" ? "已发送" : "失败"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
