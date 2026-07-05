"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, MailPlus, RefreshCw, ShieldOff } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Input,
  Select,
  Skeleton,
} from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsoleRequestError } from "@/components/console/console-request-error";

import {
  loadInvitationDeliveryAudits,
  loadWorkspaceInvitations,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  type InvitationDeliveryAudit,
  type InvitationSummary,
} from "@/lib/auth/invitations";

import { useOnWorkspaceChanged } from "@/lib/workspace-events";

import {
  InviteStatusBadge,
  WorkspaceAccessCard,
  WorkspaceAccessPageShell,
  formatWorkspaceDate,
  inviteStatusLabel,
  memberRoleLabel,
} from "../team/workspace-access-shared";

type LoadState = "loading" | "ready" | "error";
type ActionState = "idle" | "loading" | "success" | "error";
type CopyState = "idle" | "success" | "error";
type InvitationStatusFilter = "all" | InvitationSummary["status"];

export function InvitationsAuditWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [audits, setAudits] = useState<InvitationDeliveryAudit[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvitationStatusFilter>("all");
  const [resendState, setResendState] = useState<ActionState>("idle");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [confirmResendOpen, setConfirmResendOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
  const [revokeState, setRevokeState] = useState<ActionState>("idle");

  const reloadInvitations = useCallback(async (preferredId?: string) => {
    const items = await loadWorkspaceInvitations();
    setInvitations(items);

    const nextSelectedId =
      preferredId && items.some((item) => item.id === preferredId)
        ? preferredId
        : items[0]?.id ?? null;

    setSelectedInvitationId(nextSelectedId);
    return items;
  }, []);

  const loadPage = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      await reloadInvitations();
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(error instanceof Error ? error.message : "无法加载邀请记录。");
    }
  }, [reloadInvitations]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useOnWorkspaceChanged(() => {
    void loadPage();
  });

  useEffect(() => {
    if (!selectedInvitationId) {
      setAudits([]);
      return;
    }

    let mounted = true;
    setAuditsLoading(true);

    void loadInvitationDeliveryAudits(selectedInvitationId)
      .then((items) => {
        if (mounted) {
          setAudits(items);
        }
      })
      .catch(() => {
        if (mounted) {
          setAudits([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setAuditsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedInvitationId]);

  const filteredInvitations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return invitations.filter((invitation) => {
      const matchesStatus = statusFilter === "all" || invitation.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        invitation.email.toLowerCase().includes(normalizedQuery) ||
        invitation.workspaceName.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [invitations, query, statusFilter]);

  const selectedInvitation =
    invitations.find((item) => item.id === selectedInvitationId) ?? null;

  async function handleResendConfirmed() {
    if (!selectedInvitation) return;

    setResendState("loading");
    setErrorMessage(null);

    try {
      const updated = await resendWorkspaceInvitation(selectedInvitation.id);
      await reloadInvitations(updated.id);
      const nextAudits = await loadInvitationDeliveryAudits(updated.id);
      setAudits(nextAudits);
      setResendState("success");
      setConfirmResendOpen(false);
    } catch (error) {
      setResendState("error");
      setErrorMessage(error instanceof Error ? error.message : "重新发送邀请失败。");
    }
  }

  async function handleRevokeConfirmed() {
    if (!selectedInvitation) return;

    setRevokeState("loading");
    setErrorMessage(null);

    try {
      const updated = await revokeWorkspaceInvitation(selectedInvitation.id);
      await reloadInvitations(updated.id);
      setAudits([]);
      setRevokeState("success");
      setConfirmRevokeOpen(false);
    } catch (error) {
      setRevokeState("error");
      setErrorMessage(error instanceof Error ? error.message : "撤销邀请失败。");
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  if (loadState !== "ready") {
    return (
      <WorkspaceAccessPageShell
        title="邀请审计"
        description="查看团队邀请状态、投递记录，以及最近一次邀请链接和 token。"
        state={loadState}
        errorMessage={errorMessage}
        onRetry={() => void loadPage()}
        modeFeature="邀请"
      />
    );
  }

  if (invitations.length === 0) {
    return (
      <WorkspaceAccessPageShell
        title="邀请审计"
        description="查看团队邀请状态、投递记录，以及最近一次邀请链接和 token。"
        state="ready"
        modeFeature="邀请"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/team">前往团队管理</Link>
          </Button>
        }
      >
        <ConsoleEmptyState
          preset="noInvitations"
          action={
            <Button asChild>
              <Link href="/dashboard/team">去发送邀请</Link>
            </Button>
          }
        />
      </WorkspaceAccessPageShell>
    );
  }

  return (
    <WorkspaceAccessPageShell
      title="邀请审计"
      description="查看团队邀请状态、投递记录，以及最近一次邀请链接和 token。"
      state="ready"
      modeFeature="邀请"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/team">团队管理</Link>
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <WorkspaceAccessCard
          title="邀请列表"
          description="可按邮箱、工作区和状态快速筛选。"
          icon={MailPlus}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary">{filteredInvitations.length} 条</Badge>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索邮箱或工作区"
            />
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as InvitationStatusFilter)
              }
            >
              <option value="all">全部状态</option>
              <option value="pending">{inviteStatusLabel("pending")}</option>
              <option value="accepted">{inviteStatusLabel("accepted")}</option>
              <option value="revoked">{inviteStatusLabel("revoked")}</option>
              <option value="expired">{inviteStatusLabel("expired")}</option>
            </Select>
          </div>

          {filteredInvitations.length === 0 ? (
            <ConsoleEmptyState
              preset="noMatches"
              title="没有匹配的邀请"
              description="调整筛选条件或清空搜索后再试。"
              actionLabel="重置筛选"
              onAction={() => {
                setQuery("");
                setStatusFilter("all");
              }}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">邮箱</th>
                        <th className="pb-3 pr-4 font-medium">状态</th>
                        <th className="pb-3 pr-4 font-medium">角色</th>
                        <th className="pb-3 font-medium">过期时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvitations.map((invitation) => (
                        <tr
                          key={invitation.id}
                          className={[
                            "cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/40",
                            invitation.id === selectedInvitationId ? "bg-primary/5" : "",
                          ].join(" ")}
                          onClick={() => {
                            setSelectedInvitationId(invitation.id);
                            setResendState("idle");
                            setCopyState("idle");
                            setErrorMessage(null);
                          }}
                        >
                          <td className="py-4 pr-4">
                            <p className="font-medium text-foreground">{invitation.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {invitation.workspaceName}
                            </p>
                          </td>
                          <td className="py-4 pr-4">
                            <InviteStatusBadge status={invitation.status} />
                          </td>
                          <td className="py-4 pr-4">{memberRoleLabel(invitation.role)}</td>
                          <td className="py-4 text-muted-foreground">
                            {formatWorkspaceDate(invitation.expiresAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredInvitations.map((invitation) => (
                  <button
                    key={invitation.id}
                    type="button"
                    className={[
                      "w-full rounded-control border p-4 text-left transition-colors",
                      invitation.id === selectedInvitationId
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/80 bg-background/60",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedInvitationId(invitation.id);
                      setResendState("idle");
                      setCopyState("idle");
                      setErrorMessage(null);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground">{invitation.workspaceName}</p>
                      </div>
                      <InviteStatusBadge status={invitation.status} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {memberRoleLabel(invitation.role)} · 过期 {formatWorkspaceDate(invitation.expiresAt)}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </WorkspaceAccessCard>

        <WorkspaceAccessCard
          title="投递详情"
          description={
            selectedInvitation
              ? selectedInvitation.email
              : "选择左侧邀请后查看链接、token 和投递记录。"
          }
          icon={KeyRound}
        >
          {errorMessage ? (
            <ConsoleRequestError message={errorMessage} />
          ) : null}

          {!selectedInvitation ? (
            <Alert variant="info" title="选择一条邀请">
              请先在左侧选择邀请，再查看详细投递记录。
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <InviteStatusBadge status={selectedInvitation.status} />
                <Badge variant="outline">{memberRoleLabel(selectedInvitation.role)}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => setConfirmResendOpen(true)}
                  disabled={selectedInvitation.status !== "pending"}
                >
                  重新发送
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="min-h-11"
                  leftIcon={<ShieldOff className="h-4 w-4" />}
                  onClick={() => setConfirmRevokeOpen(true)}
                  disabled={selectedInvitation.status !== "pending"}
                >
                  撤销邀请
                </Button>
              </div>

              <div className="rounded-control border border-border/70 bg-background/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">最新 token</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {selectedInvitation.token}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<KeyRound className="h-4 w-4" />}
                    onClick={() => void handleCopy(selectedInvitation.token)}
                  >
                    复制
                  </Button>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">邀请链接</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {selectedInvitation.inviteUrl}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Copy className="h-4 w-4" />}
                    onClick={() => void handleCopy(selectedInvitation.inviteUrl)}
                  >
                    复制
                  </Button>
                </div>
              </div>

              {copyState === "success" ? (
                <ConsoleFeedback
                  variant="success"
                  title="已复制"
                  message="邀请 token 或链接已经复制到剪贴板。"
                  onDismiss={() => setCopyState("idle")}
                />
              ) : null}

              {copyState === "error" ? (
                <ConsoleFeedback
                  variant="warning"
                  title="复制失败"
                  message="当前浏览器环境不支持剪贴板访问，请手动复制。"
                  onDismiss={() => setCopyState("idle")}
                />
              ) : null}

              {resendState === "success" ? (
                <ConsoleFeedback
                  variant="success"
                  title="已重新发送"
                  message="系统已生成新的发送尝试，投递记录也已刷新。"
                  onDismiss={() => setResendState("idle")}
                />
              ) : null}

              {revokeState === "success" ? (
                <ConsoleFeedback
                  variant="success"
                  title="已撤销邀请"
                  message="该邀请已标记为撤销，链接将不再可用。"
                  onDismiss={() => setRevokeState("idle")}
                />
              ) : null}

              {auditsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 rounded-control" />
                  <Skeleton className="h-16 rounded-control" />
                </div>
              ) : audits.length === 0 ? (
                <Alert variant="info" title="暂无投递记录">
                  这条邀请还没有产生新的投递审计信息。
                </Alert>
              ) : (
                <div className="space-y-3">
                  {audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-control border border-border/70 bg-background/80 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            第 {audit.attempt} 次投递 / {audit.provider}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            开始时间 {formatWorkspaceDate(audit.startedAt)}
                          </p>
                        </div>
                        <Badge variant={audit.status === "sent" ? "success" : "destructive"}>
                          {audit.status === "sent" ? "已发送" : "失败"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        结束时间 {formatWorkspaceDate(audit.finishedAt)}
                      </p>
                      {audit.errorMessage ? (
                        <p className="mt-2 text-sm text-destructive">{audit.errorMessage}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </WorkspaceAccessCard>
      </div>

      <ConfirmDialog
        open={confirmRevokeOpen}
        title="确认撤销邀请"
        description={
          selectedInvitation
            ? `撤销后，${selectedInvitation.email} 将无法再通过当前邀请链接加入工作区。`
            : ""
        }
        confirmLabel="确认撤销"
        cancelLabel="取消"
        destructive
        confirmLoading={revokeState === "loading"}
        onCancel={() => setConfirmRevokeOpen(false)}
        onConfirm={() => void handleRevokeConfirmed()}
      />

      <ConfirmDialog
        open={confirmResendOpen}
        title="确认重新发送邀请"
        description={
          selectedInvitation
            ? `将向 ${selectedInvitation.email} 重新发送邀请，并生成新的投递尝试。`
            : ""
        }
        confirmLabel="重新发送"
        cancelLabel="取消"
        confirmLoading={resendState === "loading"}
        onCancel={() => setConfirmResendOpen(false)}
        onConfirm={() => void handleResendConfirmed()}
      />
    </WorkspaceAccessPageShell>
  );
}
