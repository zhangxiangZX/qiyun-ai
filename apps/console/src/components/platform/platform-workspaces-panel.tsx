"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Input, Label } from "@qiyun/ui";

import {
  listCustomerWorkspaces,
  listTrialRequests,
  provisionCustomerWorkspace,
  reviewTrialRequest,
  type CustomerWorkspaceItem,
  type TrialRequestItem,
} from "@/lib/platform/api";
import {
  defaultWorkspacePlan,
  workspacePlanLabel,
  workspacePlanOptions,
} from "@/lib/platform/plans";

const planOptions = workspacePlanOptions;

function defaultReviewPlan(item: TrialRequestItem): string {
  return item.requestedPlan || defaultWorkspacePlan;
}

type ReviewDraft = {
  plan: string;
  adminEmail: string;
  reviewNotes: string;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN");
}

function statusLabel(status: TrialRequestItem["status"]): string {
  switch (status) {
    case "approved":
      return "已通过";
    case "rejected":
      return "已拒绝";
    default:
      return "待审核";
  }
}

export function PlatformWorkspacesPanel() {
  const [items, setItems] = useState<CustomerWorkspaceItem[]>([]);
  const [trialRequests, setTrialRequests] = useState<TrialRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [form, setForm] = useState({
    companyName: "",
    website: "",
    plan: "professional",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    adminEmail: "",
  });

  const pendingRequests = useMemo(
    () => trialRequests.filter((item) => item.status === "pending"),
    [trialRequests],
  );
  const reviewedRequests = useMemo(
    () => trialRequests.filter((item) => item.status !== "pending"),
    [trialRequests],
  );

  const ensureDraft = useCallback((item: TrialRequestItem): ReviewDraft => {
    return (
      reviewDrafts[item.id] ?? {
        plan: defaultReviewPlan(item),
        adminEmail: item.email,
        reviewNotes: "",
      }
    );
  }, [reviewDrafts]);

  const updateDraft = useCallback((id: string, patch: Partial<ReviewDraft>) => {
    setReviewDrafts((current) => ({
      ...current,
      [id]: {
        plan: current[id]?.plan ?? defaultWorkspacePlan,
        adminEmail: current[id]?.adminEmail ?? "",
        reviewNotes: current[id]?.reviewNotes ?? "",
        ...patch,
      },
    }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workspaces, requests] = await Promise.all([
        listCustomerWorkspaces(),
        listTrialRequests(),
      ]);
      setItems(workspaces);
      setTrialRequests(requests);
      setReviewDrafts((current) => {
        const next = { ...current };
        for (const item of requests) {
          next[item.id] = next[item.id] ?? {
            plan: defaultReviewPlan(item),
            adminEmail: item.email,
            reviewNotes: item.reviewNotes ?? "",
          };
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败。");
      setItems([]);
      setTrialRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await provisionCustomerWorkspace(form);
      setSuccessMessage(
        `已创建“${result.workspace.name}”，管理员邀请已发送至 ${result.invitation.email}。`,
      );
      setForm({
        companyName: "",
        website: "",
        plan: "professional",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        adminEmail: "",
      });
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(item: TrialRequestItem, action: "approve" | "reject") {
    const draft = ensureDraft(item);
    setReviewingId(item.id);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await reviewTrialRequest(item.id, {
        action,
        plan: action === "approve" ? draft.plan : undefined,
        adminEmail: action === "approve" ? draft.adminEmail : undefined,
        reviewNotes: draft.reviewNotes,
      });
      setSuccessMessage(
        action === "approve"
          ? `已通过“${result.companyName}”的试用申请，并创建工作区。`
          : `已拒绝“${result.companyName}”的试用申请。`,
      );
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "处理试用申请失败。");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section
        id="trial-review"
        className="rounded-card border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">试用申请审核</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              统一处理官网提交的试用申请，通过后会自动创建工作区并发送管理员邀请。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/invitations">查看邀请记录</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              刷新
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        {successMessage ? <p className="mt-4 text-sm text-emerald-700">{successMessage}</p> : null}
        {loading ? <p className="mt-4 text-sm text-muted-foreground">加载中...</p> : null}

        {!loading && pendingRequests.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">当前没有待审核试用申请。</p>
        ) : null}

        {!loading && pendingRequests.length > 0 ? (
          <div className="mt-6 space-y-4">
            {pendingRequests.map((item) => {
              const draft = ensureDraft(item);
              const busy = reviewingId === item.id;
              return (
                <article key={item.id} className="rounded-card border border-border/80 bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.companyName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.contactName} · {item.email} · 提交于 {formatDateTime(item.submittedAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">联系电话</dt>
                      <dd className="mt-1 text-foreground">{item.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">官网地址</dt>
                      <dd className="mt-1 text-foreground">{item.website || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">意向套餐</dt>
                      <dd className="mt-1 text-foreground">{workspacePlanLabel(item.requestedPlan)}</dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-muted-foreground">需求描述</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-foreground">{item.requirement || "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`plan-${item.id}`}>开通套餐（可调整）</Label>
                      <select
                        id={`plan-${item.id}`}
                        className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
                        value={draft.plan}
                        disabled={busy}
                        onChange={(event) => updateDraft(item.id, { plan: event.target.value })}
                      >
                        {planOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`adminEmail-${item.id}`}>管理员邮箱</Label>
                      <Input
                        id={`adminEmail-${item.id}`}
                        type="email"
                        value={draft.adminEmail}
                        disabled={busy}
                        onChange={(event) => updateDraft(item.id, { adminEmail: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`reviewNotes-${item.id}`}>审核备注</Label>
                      <textarea
                        id={`reviewNotes-${item.id}`}
                        className="min-h-24 w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={draft.reviewNotes}
                        disabled={busy}
                        onChange={(event) => updateDraft(item.id, { reviewNotes: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button loading={busy} onClick={() => void handleReview(item, "approve")}>
                      通过并开通工作区
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleReview(item, "reject")}
                    >
                      拒绝申请
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && reviewedRequests.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground">最近处理记录</h3>
            <div className="mt-3 space-y-3">
              {reviewedRequests.slice(0, 6).map((item) => (
                <article key={item.id} className="rounded-card border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.companyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.contactName} · {item.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    处理时间：{formatDateTime(item.reviewedAt)}
                    {item.processedBy ? ` · 处理人：${item.processedBy.name}` : ""}
                  </p>
                  {item.reviewNotes ? (
                    <p className="mt-2 text-sm text-foreground">备注：{item.reviewNotes}</p>
                  ) : null}
                  {item.approvedWorkspace ? (
                    <p className="mt-2 text-sm text-foreground">
                      已开通工作区：{item.approvedWorkspace.name}
                      {item.approvedWorkspace.inviteEmail
                        ? ` · 邀请邮箱：${item.approvedWorkspace.inviteEmail}`
                        : ""}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-card border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-card-foreground">手工创建客户工作区</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          适用于线下签约、销售代录或绕过试用申请直接开通的场景。
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="companyName">企业名称</Label>
            <Input
              id="companyName"
              value={form.companyName}
              placeholder="例如：库滋玛工业机械"
              onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">企业官网</Label>
            <Input
              id="website"
              value={form.website}
              placeholder="https://"
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">套餐</Label>
            <select
              id="plan"
              className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
              value={form.plan}
              onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}
            >
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">联系人</Label>
            <Input
              id="contactName"
              value={form.contactName}
              onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">联系邮箱</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">联系电话</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="adminEmail">企业管理员邮箱（接收邀请）</Label>
            <Input
              id="adminEmail"
              type="email"
              value={form.adminEmail}
              placeholder="admin@customer.com"
              onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={() => void handleSubmit()} loading={submitting}>
            创建工作区并发送邀请
          </Button>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-card-foreground">已开通工作区</h2>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            刷新
          </Button>
        </div>

        {!loading && items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">暂无客户工作区。</p>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">企业</th>
                  <th className="py-2 pr-4">套餐</th>
                  <th className="py-2 pr-4">联系人</th>
                  <th className="py-2 pr-4">管理员邀请</th>
                  <th className="py-2">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/70">
                    <td className="py-3 pr-4 font-medium">{item.name}</td>
                    <td className="py-3 pr-4">{item.plan ?? "—"}</td>
                    <td className="py-3 pr-4">
                      {item.contactName ?? "—"}
                      {item.contactEmail ? ` · ${item.contactEmail}` : ""}
                    </td>
                    <td className="py-3 pr-4">
                      {item.pendingAdminInvite ? (
                        <span>
                          {item.pendingAdminInvite.email}（{item.pendingAdminInvite.status}）
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">{formatDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
