"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ChevronRight,
  ClipboardList,
  FileText,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  RefreshCw,
  User,
  UserCheck,
} from "lucide-react";

import { Badge, Button, Select, Skeleton } from "@qiyun/ui";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import {
  fetchConsoleMode,
  isPreviewMode,
} from "@/lib/api/mode";
import { loadWorkspaceMembers, type WorkspaceMemberSummary } from "@/lib/auth/members";
import {
  type SelectionSubmission,
  type SelectionSubmissionAttachment,
  type SelectionSubmissionDetail,
  type SelectionSubmissionStatus,
  SUBMISSION_STATUS_META,
  assignSubmission,
  archiveSubmission,
  buildMockSubmissionDetail,
  buildMockSubmissions,
  downloadSubmissionAttachment,
  formatBytes,
  getSelectionPageById,
  getSelectionSubmission,
  listSelectionSubmissions,
  retrySubmissionConversion,
} from "@/lib/bots/selection-pages-api";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function SubmissionStatusBadge({ status }: { status: SelectionSubmissionStatus }) {
  const meta = SUBMISSION_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function SelectionSubmissionsWorkspace({ pageId }: { pageId: string }) {
  const [isPreview, setIsPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SelectionSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [detail, setDetail] = useState<SelectionSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [questionLabels, setQuestionLabels] = useState<Map<string, string>>(new Map());

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOwnerId, setAssignOwnerId] = useState<string>("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const modeInfo = await fetchConsoleMode().catch(() => null);
      const preview = modeInfo ? isPreviewMode(modeInfo) : true;
      setIsPreview(preview);
      let list: SelectionSubmission[];
      if (preview) {
        list = buildMockSubmissions(pageId);
      } else {
        list = await listSelectionSubmissions(pageId);
      }
      setSubmissions(list);
      setSelectedId((current) => current && list.some((entry) => entry.id === current)
        ? current
        : (list[0]?.id ?? null));
      if (!preview) {
        try {
          const page = await getSelectionPageById(pageId).catch(() => null);
          setQuestionLabels(new Map((page?.questions ?? []).map((q) => [q.id, q.label])));
        } catch {
          setQuestionLabels(new Map());
        }
      }
    } catch (nextError) {
      setSubmissions(buildMockSubmissions(pageId));
      setSelectedId((current) => current ?? "ss-mock-preview-0");
      setError(nextError instanceof Error ? nextError.message : "加载提交记录失败。");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  const loadDetail = useCallback(async (submissionId: string | null) => {
    if (!submissionId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setActionError(null);
    setNotice(null);
    setAssignOpen(false);
    try {
      const next = isPreview
        ? buildMockSubmissionDetail(pageId, submissionId)
        : await getSelectionSubmission(pageId, submissionId);
      setDetail(next);
    } catch {
      setDetail(buildMockSubmissionDetail(pageId, submissionId));
    } finally {
      setDetailLoading(false);
    }
  }, [isPreview, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  useEffect(() => {
    if (isPreview) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    loadWorkspaceMembers()
      .then((next) => {
        if (!cancelled) setMembers(next);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isPreview]);

  const refreshAfterAction = useCallback(async () => {
    if (isPreview) return;
    const next = await listSelectionSubmissions(pageId).catch(() => submissions);
    setSubmissions(next);
    if (selectedId) {
      const updated = await getSelectionSubmission(pageId, selectedId).catch(() => null);
      if (updated) setDetail(updated);
    }
  }, [isPreview, pageId, selectedId, submissions]);

  const handleRetry = async () => {
    if (!selectedId || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (!isPreview) await retrySubmissionConversion(pageId, selectedId);
      setNotice("已重新尝试转化为线索，系统将自动创建询盘与首次跟进任务。");
      await refreshAfterAction();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "重试转化失败。");
    } finally {
      setActionBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedId || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (!isPreview) await archiveSubmission(pageId, selectedId);
      setNotice("该提交记录已归档。");
      await refreshAfterAction();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "归档失败。");
    } finally {
      setActionBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedId || !assignOwnerId || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (!isPreview) await assignSubmission(pageId, selectedId, assignOwnerId);
      const owner = members.find((member) => member.userId === assignOwnerId);
      setNotice(`已将该线索分配给 ${owner?.name ?? "负责人"}。`);
      setAssignOpen(false);
      await refreshAfterAction();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "分配失败。");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownload = (attachment: SelectionSubmissionAttachment) => {
    if (isPreview) {
      setNotice("当前为预览数据，无法下载真实附件。");
      return;
    }
    try {
      downloadSubmissionAttachment(attachment.id, attachment.name);
    } catch {
      setActionError("附件下载失败。");
    }
  };

  const answerEntries = useMemo(() => {
    if (!detail) return [];
    return Object.entries(detail.answers).map(([key, value]) => ({
      label: questionLabels.get(key) ?? key,
      value,
    }));
  }, [detail, questionLabels]);

  const selected = submissions.find((entry) => entry.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {error ? (
        <ConsoleFeedback variant="error" title="加载失败" message={error} onDismiss={() => setError(null)} />
      ) : null}
      {notice ? (
        <ConsoleFeedback variant="success" title="操作成功" message={notice} onDismiss={() => setNotice(null)} />
      ) : null}
      {actionError ? (
        <ConsoleFeedback variant="error" title="操作失败" message={actionError} onDismiss={() => setActionError(null)} />
      ) : null}

      {isPreview ? (
        <div className="rounded-control border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          当前为预览数据，提交记录为演示内容；分配、归档与重试转化在接入真实后端后生效。
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,460px)]">
          <Skeleton className="h-[560px] rounded-2xl" />
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      ) : submissions.length === 0 ? (
        <ConsoleEmptyState
          preset="noMatches"
          title="暂无提交记录"
          description="访客在选型页填写并提交后，记录会显示在这里。"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,460px)]">
          {/* 左：提交列表 */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">提交记录</h3>
              <Badge variant="secondary">{submissions.length} 条</Badge>
            </div>
            <ul className="max-h-[600px] divide-y divide-border/60 overflow-y-auto">
              {submissions.map((submission) => {
                const selected = selectedId === submission.id;
                return (
                  <li key={submission.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(submission.id)}
                      className={`group relative flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                        selected ? "bg-accent/60" : "hover:bg-accent/40"
                      }`}
                    >
                      {selected ? (
                        <span className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {submission.contactName ?? "匿名访客"}
                          </span>
                          <SubmissionStatusBadge status={submission.status} />
                        </div>
                        <div className="truncate text-sm text-foreground">
                          {submission.contactPhone ?? submission.contactEmail ?? "未留联系方式"}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                            {formatDateTime(submission.createdAt)}
                          </span>
                          {submission.attachmentIds.length > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip size={12} /> {submission.attachmentIds.length}
                            </span>
                          ) : null}
                          {submission.inquiryId ? (
                            <span className="inline-flex items-center gap-1 text-success">
                              <UserCheck size={12} /> 已转化
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`mt-2 shrink-0 transition-colors ${
                          selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 右：提交详情 */}
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {detailLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {detail.contactName ?? "匿名访客"}
                    </h3>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(detail.createdAt)} 提交
                    </div>
                  </div>
                  <SubmissionStatusBadge status={detail.status} />
                </div>

                <section className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <User size={14} className="text-primary" />
                    联系方式
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone size={14} className="text-muted-foreground" />
                      {detail.contactPhone ? (
                        <span className="font-medium">{detail.contactPhone}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail size={14} className="text-muted-foreground" />
                      {detail.contactEmail ? (
                        <span className="font-medium">{detail.contactEmail}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <ClipboardList size={14} className="text-primary" />
                    选型答案
                  </div>
                  {answerEntries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">未填写选型参数。</div>
                  ) : (
                    <dl className="grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
                      {answerEntries.map((entry) => (
                        <div
                          key={entry.label}
                          className="contents"
                        >
                          <dt className="text-muted-foreground">{entry.label}</dt>
                          <dd className="text-right font-medium text-foreground sm:text-left">
                            {entry.value || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>

                <section className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Paperclip size={14} className="text-primary" />
                    附件（{detail.attachments.length}）
                  </div>
                  {detail.attachments.length === 0 ? (
                    <div className="text-sm text-muted-foreground">没有上传附件。</div>
                  ) : (
                    <ul className="space-y-2">
                      {detail.attachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <FileText size={16} className="shrink-0 text-primary" />
                            <span className="truncate text-sm font-medium text-foreground">
                              {attachment.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatBytes(attachment.sizeBytes)}
                            </span>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-primary hover:bg-primary/5 hover:text-primary"
                            onClick={() => handleDownload(attachment)}
                          >
                            下载
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <AlertCircle size={14} className="text-primary" />
                    关联线索
                  </div>
                  {detail.inquiryId ? (
                    <Link
                      href="/dashboard/inquiries"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      查看关联询盘 <ChevronRight size={14} />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                      尚未转化为线索
                    </div>
                  )}
                </section>

                {/* 操作区 */}
                <div className="space-y-3 border-t border-border pt-4">
                  {assignOpen ? (
                    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="text-sm font-semibold text-foreground">选择负责人</div>
                      <Select
                        value={assignOwnerId}
                        onChange={(event) => setAssignOwnerId(event.target.value)}
                        disabled={actionBusy}
                      >
                        <option value="">请选择团队成员</option>
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.name}（{member.role}）
                          </option>
                        ))}
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAssign} disabled={!assignOwnerId || actionBusy}>
                          {actionBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                          确定分配
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAssignOpen(false)} disabled={actionBusy}>
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={actionBusy || Boolean(detail.inquiryId)}
                      title={detail.inquiryId ? "已转化，无需重试" : "重新尝试转化为线索"}
                    >
                      {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      重试转化
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssignOwnerId("");
                        setAssignOpen(true);
                      }}
                      disabled={actionBusy || !detail.inquiryId}
                      title={detail.inquiryId ? "分配线索负责人" : "需先转化为线索"}
                    >
                      <UserCheck size={14} />
                      分配负责人
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleArchive}
                      disabled={actionBusy || detail.status === "archived"}
                    >
                      {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                      归档
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
                <Inbox size={32} />
                <span className="text-sm">请选择一条提交记录查看详情</span>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
