"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Globe,
  Link2,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  UserCheck,
  X,
} from "lucide-react";

import { Badge, Button, StatCard } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { isPreviewModeError, useApiResource } from "@/lib/api/use-api-resource";
import { assignInquiry, batchAssignInquiries } from "@/lib/sales/api";
import { formatInquiryDate } from "@/lib/sales/quick-entry-helpers";
import {
  INTENT_LABELS,
  SOURCE_TYPE_LABELS,
  type InquiryAssignCandidate,
  type InquiryAssignStats,
  type InquiryListItem,
} from "@/lib/sales/types";

/** Preview-only empty shells — never use rich fake stats that mask API failures. */
const EMPTY_INQUIRIES: InquiryListItem[] = [];
const EMPTY_ASSIGN_STATS: InquiryAssignStats = {
  unassignedCount: 0,
  todayNewCount: 0,
  highPriorityUnassignedCount: 0,
  avgAssignHours: null,
  assignedOpenCount: 0,
  monthAssignedCount: 0,
};
const EMPTY_CANDIDATES: InquiryAssignCandidate[] = [];

function candidateStatusLabel(status: InquiryAssignCandidate["status"]) {
  if (status === "busy") return "忙碌";
  if (status === "idle") return "空闲";
  return "正常";
}

function candidateStatusVariant(status: InquiryAssignCandidate["status"]) {
  if (status === "busy") return "destructive" as const;
  if (status === "idle") return "info" as const;
  return "success" as const;
}

function IntentStars({ level }: { level: InquiryListItem["intentLevel"] }) {
  const count = level === "high" ? 5 : level === "medium" ? 3 : 2;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-sm leading-none">
          {i < count ? (
            <Flame size={13} className="fill-warning text-warning" />
          ) : (
            <span className="text-muted-foreground/30">○</span>
          )}
        </span>
      ))}
    </span>
  );
}

function channelIcon(sourceType: InquiryListItem["sourceType"]) {
  if (sourceType === "website" || sourceType === "sales_link") {
    return <Globe size={13} />;
  }
  if (sourceType === "expo") {
    return <Calendar size={13} />;
  }
  if (sourceType === "douyin" || sourceType === "wechat") {
    return <Share2 size={13} />;
  }
  return <Search size={13} />;
}

function priorityVariant(level: InquiryListItem["intentLevel"]) {
  if (level === "high") return "destructive" as const;
  if (level === "medium") return "warning" as const;
  return "secondary" as const;
}

export function InquiryAssignmentWorkspace() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(focusId);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [assignRemark, setAssignRemark] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const {
    data: allInquiries,
    loading: inquiriesLoading,
    error: inquiriesError,
    refetch: refetchInquiries,
  } = useApiResource<InquiryListItem[]>("/inquiries?limit=200&status=open", EMPTY_INQUIRIES);

  const {
    data: assignStats,
    error: statsError,
    refetch: refetchAssignStats,
  } = useApiResource<InquiryAssignStats>("/inquiries/assign-stats", EMPTY_ASSIGN_STATS);

  const unassigned = useMemo(() => {
    const items = allInquiries.filter((item) => !item.ownerId);
    if (!query.trim()) return items;
    const needle = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.customerName.toLowerCase().includes(needle) ||
        item.id.toLowerCase().includes(needle) ||
        (item.summary?.toLowerCase().includes(needle) ?? false),
    );
  }, [allInquiries, query]);

  const activeInquiry = useMemo(
    () => unassigned.find((item) => item.id === activeId) ?? unassigned[0] ?? null,
    [unassigned, activeId],
  );

  const {
    data: candidates,
    loading: candidatesLoading,
    refetch: refetchCandidates,
  } = useApiResource<InquiryAssignCandidate[]>(
    activeInquiry
      ? `/inquiries/${encodeURIComponent(activeInquiry.id)}/assign-candidates`
      : "/inquiries/assign-stats",
    EMPTY_CANDIDATES,
    { enabled: !!activeInquiry, deps: [activeInquiry?.id] },
  );

  const recommended = useMemo(
    () => candidates.find((item) => item.recommended) ?? candidates[0] ?? null,
    [candidates],
  );

  const alternatives = useMemo(
    () => candidates.filter((item) => !item.recommended).slice(0, 3),
    [candidates],
  );

  const selectedOwner = useMemo(
    () => candidates.find((item) => item.userId === ownerId) ?? recommended ?? null,
    [candidates, ownerId, recommended],
  );

  useEffect(() => {
    if (focusId) setActiveId(focusId);
  }, [focusId]);

  useEffect(() => {
    const top = candidates.find((item) => item.recommended) ?? candidates[0];
    setOwnerId(top?.userId ?? null);
  }, [activeInquiry?.id, candidates]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleAssign = async (batch: boolean) => {
    if (assigning) return;
    const targetOwnerId = selectedOwner?.userId;
    if (!targetOwnerId) {
      setAssignError("请选择负责人。");
      return;
    }
    const inquiryIds = batch
      ? selectedIds.length > 0
        ? selectedIds
        : activeInquiry
          ? [activeInquiry.id]
          : []
      : activeInquiry
        ? [activeInquiry.id]
        : [];
    if (inquiryIds.length === 0) {
      setAssignError("请选择要分配的询盘。");
      return;
    }
    if (!assignRemark.trim()) {
      setAssignError("请填写分配备注。");
      return;
    }

    setAssigning(true);
    setAssignError(null);
    setAssignMessage(null);
    try {
      if (inquiryIds.length === 1) {
        await assignInquiry(inquiryIds[0], targetOwnerId, assignRemark.trim());
      } else {
        await batchAssignInquiries(inquiryIds, targetOwnerId, assignRemark.trim());
      }
      setAssignMessage(`已成功分配 ${inquiryIds.length} 个询盘。`);
      setSelectedIds([]);
      setAssignRemark("");
      await refetchInquiries();
      refetchAssignStats();
      refetchCandidates();
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setAssignError("预览模式下无法分配询盘，请配置 API_BASE_URL。");
      } else {
        setAssignError(getApiErrorMessage(err, "分配失败，请稍后重试。"));
      }
    } finally {
      setAssigning(false);
    }
  };

  const refreshAll = () => {
    refetchInquiries();
    refetchAssignStats();
    if (activeInquiry) {
      refetchCandidates();
    }
  };

  const displayInquiries = unassigned;
  const loadError = inquiriesError || statsError;

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="询盘分配" />
        {loadError ? (
          <ConsoleRequestError message={loadError} onRetry={refreshAll} />
        ) : null}
      </ConsolePageAlerts>

      <div className="pb-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              placeholder="搜索待分配询盘"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-48 rounded-control border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <Button variant="outline" onClick={refreshAll}>
            重置
          </Button>
          <Button
            leftIcon={<Users size={15} />}
            disabled={assigning || selectedIds.length === 0}
            onClick={() => void handleAssign(true)}
          >
            批量分配
          </Button>
        </div>
      </div>

      {assignError ? (
        <div className="mx-4 mb-4 rounded-control border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:mx-6 lg:mx-page">
          {assignError}
        </div>
      ) : null}
      {assignMessage ? (
        <div className="mx-4 mb-4 rounded-control border border-success/30 bg-success/5 px-4 py-3 text-sm text-success sm:mx-6 lg:mx-page">
          {assignMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="待分配询盘"
          value={String(assignStats.unassignedCount)}
          icon={<InboxPlaceholder />}
          iconTone="brand"
          emphasis="metric"
        />
        <StatCard
          label="今日新增询盘"
          value={String(assignStats.todayNewCount)}
          icon={<TrendingUp size={22} />}
          iconTone="warning"
          emphasis="metric"
        />
        <StatCard
          label="高优先级询盘"
          value={String(assignStats.highPriorityUnassignedCount)}
          description={
            assignStats.unassignedCount
              ? `占比 ${Math.round(
                  (assignStats.highPriorityUnassignedCount / assignStats.unassignedCount) * 100,
                )}%`
              : undefined
          }
          icon={<AlertTriangle size={22} />}
          iconTone="warning"
          tone="warning"
          emphasis="metric"
        />
        <StatCard
          label="平均分配时长"
          value={assignStats.avgAssignHours != null ? `${assignStats.avgAssignHours} 小时` : "—"}
          icon={<Clock size={22} />}
          iconTone="info"
          emphasis="metric"
        />
        <StatCard
          label="已分配"
          value={String(assignStats.assignedOpenCount)}
          icon={<CheckCircle2 size={22} />}
          iconTone="success"
          emphasis="metric"
        />
        <StatCard
          label="本月分配总计"
          value={String(assignStats.monthAssignedCount)}
          icon={<UserCheck size={22} />}
          iconTone="purple"
          emphasis="metric"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 rounded-card border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              询盘列表 (共 {displayInquiries.length} 条)
            </h3>
            <span className="text-xs text-muted-foreground">已选择 {selectedIds.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="w-8 px-3 py-2.5 text-left" />
                  <th className="px-3 py-2.5 text-left font-medium">询盘编号</th>
                  <th className="px-3 py-2.5 text-left font-medium">客户姓名</th>
                  <th className="px-3 py-2.5 text-left font-medium">渠道来源</th>
                  <th className="px-3 py-2.5 text-left font-medium">产品项目</th>
                  <th className="px-3 py-2.5 text-left font-medium">客户意向</th>
                  <th className="px-3 py-2.5 text-left font-medium">优先级</th>
                  <th className="px-3 py-2.5 text-left font-medium">创建时间</th>
                  <th className="px-3 py-2.5 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {inquiriesLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      加载中…
                    </td>
                  </tr>
                ) : displayInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      暂无待分配询盘
                    </td>
                  </tr>
                ) : (
                  displayInquiries.map((q) => {
                    const selected = selectedIds.includes(q.id);
                    const active = activeInquiry?.id === q.id;
                    return (
                      <tr
                        key={q.id}
                        className={`border-b border-border/60 last:border-0 hover:bg-accent/40 ${
                          active ? "bg-primary/5" : ""
                        }`}
                        onClick={() => setActiveId(q.id)}
                      >
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(q.id);
                            }}
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              selected ? "border-primary bg-primary" : "border-input"
                            }`}
                          >
                            {selected ? <CheckCircle2 size={11} className="text-white" /> : null}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                          {q.id.slice(-12)}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{q.customerName}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            {channelIcon(q.sourceType)}
                            {SOURCE_TYPE_LABELS[q.sourceType]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-foreground/80">
                          {q.summary?.slice(0, 24) ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <IntentStars level={q.intentLevel} />
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={priorityVariant(q.intentLevel)}>
                            {INTENT_LABELS[q.intentLevel]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {formatInquiryDate(q.createdAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/dashboard/inquiries/${q.id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            查看
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-foreground">分配详情</h3>
            {activeInquiry ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {activeInquiry.customerName.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{activeInquiry.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeInquiry.customerContact ?? "暂无联系方式"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">询盘编号</span>
                    <span className="font-mono text-xs text-foreground">{activeInquiry.id.slice(-12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">产品项目</span>
                    <span className="font-medium text-foreground">
                      {activeInquiry.summary?.slice(0, 20) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">渠道来源</span>
                    <span className="font-medium text-foreground">
                      {SOURCE_TYPE_LABELS[activeInquiry.sourceType]}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/inquiries/${activeInquiry.id}`}
                  className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  查看完整详情
                  <Link2 size={12} />
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">请选择待分配询盘</p>
            )}
          </div>

          <div className="overflow-hidden rounded-card border border-purple-200 bg-card shadow-card">
            <div className="flex items-center gap-2 border-b border-purple-200 bg-purple-50 px-4 py-3">
              <Sparkles size={15} className="text-purple-500" />
              <h3 className="text-sm font-semibold text-foreground">推荐分配</h3>
            </div>
            <div className="p-4">
              {candidatesLoading ? (
                <p className="text-sm text-muted-foreground">加载推荐中…</p>
              ) : recommended ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                        {recommended.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{recommended.name}</p>
                        <p className="text-xs text-muted-foreground">{recommended.email}</p>
                      </div>
                    </div>
                    <Badge variant="success">推荐</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 items-center gap-3 rounded-control bg-muted/30 p-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">当前负载</p>
                      <p className="text-lg font-semibold text-foreground">
                        {recommended.currentLoad}/{recommended.maxCapacity}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">匹配度</p>
                      <p className="text-2xl font-bold text-success">{recommended.matchScore}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{recommended.reason}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setOwnerId(recommended.userId)}
                  >
                    选用推荐负责人
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">暂无可用成员</p>
              )}
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-foreground">备选人员</h3>
            <ul className="space-y-2.5">
              {alternatives.map((item) => (
                <li key={item.userId} className="rounded-control border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-sm font-medium text-foreground hover:text-primary"
                      onClick={() => setOwnerId(item.userId)}
                    >
                      {item.name}
                    </button>
                    <Badge variant={candidateStatusVariant(item.status)}>
                      {candidateStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      当前负载 {item.currentLoad}/{item.maxCapacity}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-warning"
                        style={{ width: `${item.loadRate}%` }}
                      />
                    </div>
                    <span>匹配度 {item.matchScore}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-foreground">分配设置</h3>
            <label className="mb-1 block text-xs font-medium text-foreground">
              指定负责人 <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedOwner?.userId ?? ""}
              onChange={(e) => setOwnerId(e.target.value || null)}
              className="mb-3 h-9 w-full rounded-control border border-input bg-background px-3 text-sm outline-none focus:border-primary/40"
            >
              <option value="">请选择负责人</option>
              {candidates.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}（{member.role} · {member.matchScore}%）
                </option>
              ))}
            </select>
            {selectedOwner ? (
              <div className="mb-3 flex items-center justify-between rounded-control border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{selectedOwner.name}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setOwnerId(null)}
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
            <label className="mb-1 block text-xs font-medium text-foreground">
              备注 <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={3}
              value={assignRemark}
              onChange={(e) => setAssignRemark(e.target.value.slice(0, 206))}
              placeholder="请输入备注信息，如客户特点、意愿度等…"
              className="w-full resize-none rounded-control border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{assignRemark.length}/206</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                className="flex-1"
                leftIcon={<Users size={15} />}
                disabled={assigning}
                onClick={() => void handleAssign(true)}
              >
                批量分配
              </Button>
              <Button
                variant="outline"
                disabled={assigning || !activeInquiry}
                onClick={() => void handleAssign(false)}
              >
                确认分配
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              待分配 {selectedIds.length > 0 ? selectedIds.length : activeInquiry ? 1 : 0} 个询盘
            </p>
          </div>
        </aside>
      </div>
    </ConsolePage>
  );
}

function InboxPlaceholder() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
