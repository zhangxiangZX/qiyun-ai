"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Lightbulb,
  Phone,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import { Badge, Button, Input, Label, Select } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import { createFollowTask } from "@/lib/follow-tasks/api";
import { listInquiries } from "@/lib/sales/api";
import { resolveReturnTo } from "@/lib/sales/list-return";
import type { InquiryListItem } from "@/lib/sales/types";

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-card border border-border bg-card p-5 shadow-card ${className ?? ""}`}>
      {children}
    </section>
  );
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

const followUpStrategies = [
  "您目前的采购计划是什么样的？是否有具体的时间表？",
  "对产品的期望度是多少？是否持特的认可或追求？",
  "目前是否已有供应商？您选择供应商时最看重哪些原因？",
  "对交货和售后服务有什么具体要求？",
  "是否需要我们把样品进一步的技术资料？",
];

const nextActions = [
  { icon: <Phone size={16} />, title: "本次通话重点", body: "确认采购时间，建立需求清单" },
  { icon: <FileText size={16} />, title: "准备资料", body: "产品资料书、认证证书、案例、报价模板" },
  { icon: <User size={16} />, title: "后续动作", body: "根据反馈制定方案与报价，安排下一次会议" },
  { icon: <Clock size={16} />, title: "建议下次联络时间", body: "3-5 个工作日后" },
];

const checklistSeed = [
  "确认客户当前采购计划时间节点",
  "确认产品技术要求与选型需求",
  "确认预算范围与决策流程",
  "介绍解决方案与竞品",
  "约定下一步跟进（样品 / 报价 / 会议）",
];

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function NewTaskWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryIdFromQuery = searchParams.get("inquiryId") ?? "";
  const backHref = resolveReturnTo(searchParams.get("returnTo"), "/dashboard/tasks");

  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [inquiryId, setInquiryId] = useState(inquiryIdFromQuery);
  const [title, setTitle] = useState("电话跟进");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [dueTime, setDueTime] = useState("10:00");
  const [desc, setDesc] = useState("");
  const [checked, setChecked] = useState<boolean[]>(() => checklistSeed.map(() => false));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedInquiry = useMemo(
    () => inquiries.find((item) => item.id === inquiryId) ?? null,
    [inquiries, inquiryId],
  );

  const loadInquiries = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const items = await listInquiries({ status: "open", limit: 100 });
      setInquiries(items);
      if (!inquiryId && items[0]) {
        setInquiryId(items[0].id);
      }
    } catch (error) {
      setInquiries([]);
      setListError(getApiErrorMessage(error, "询盘列表加载失败，请稍后重试。"));
    } finally {
      setListLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    void loadInquiries();
  }, [loadInquiries]);

  const toggle = (i: number) => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const canSubmit = Boolean(title.trim() && dueDate && !submitting);

  const handleCreate = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const checklistNote = checklistSeed
        .filter((_, i) => checked[i])
        .map((item) => `✓ ${item}`)
        .join("\n");
      const noteParts = [
        `优先级：${priority === "high" ? "高" : priority === "low" ? "低" : "中"}`,
        desc.trim() || null,
        checklistNote || null,
      ].filter(Boolean);

      const dueAt = new Date(`${dueDate}T${dueTime || "09:00"}:00`);
      if (Number.isNaN(dueAt.getTime())) {
        setSubmitError("截止日期无效，请重新选择。");
        return;
      }

      const created = await createFollowTask({
        title: title.trim(),
        dueAt: dueAt.toISOString(),
        inquiryId: inquiryId || undefined,
        customerName: selectedInquiry?.customerName,
        note: noteParts.join("\n"),
        priority,
      });
      router.push(`/dashboard/tasks?created=${encodeURIComponent(created.id)}`);
    } catch (error) {
      if (isPreviewModeError(error)) {
        setSubmitError("预览模式下无法创建跟进任务，请配置 API_BASE_URL。");
      } else {
        setSubmitError(getApiErrorMessage(error, "创建任务失败，请稍后重试。"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="新建跟进任务" />
        {listError ? <ConsoleRequestError message={listError} onRetry={() => void loadInquiries()} /> : null}
        {submitError ? <ConsoleRequestError message={submitError} /> : null}
      </ConsolePageAlerts>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 rounded-control border border-border p-2 text-muted-foreground hover:text-primary"
            aria-label="返回任务列表"
          >
            <ArrowLeft size={16} />
          </Link>
          <p className="text-sm text-muted-foreground">返回任务列表</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="w-full space-y-6 lg:w-[55%]">
          <Card>
            <CardTitle>基础信息</CardTitle>
            <div className="space-y-4">
              <Field label="关联询盘" required>
                <Select
                  value={inquiryId}
                  disabled={listLoading || submitting}
                  onChange={(event) => setInquiryId(event.target.value)}
                >
                  <option value="">不关联询盘</option>
                  {inquiries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.customerName} · {item.id.slice(-8)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="客户">
                <Input
                  value={selectedInquiry?.customerName ?? ""}
                  readOnly
                  placeholder={listLoading ? "加载中…" : "选择询盘后自动带出"}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>任务设置</CardTitle>
            <div className="space-y-4">
              <Field label="任务标题" required>
                <Input
                  value={title}
                  disabled={submitting}
                  onChange={(event) => setTitle(event.target.value.slice(0, 120))}
                  placeholder="如：电话确认交期与预算"
                />
              </Field>

              <Field label="跟进目标">
                <Select
                  value={title}
                  disabled={submitting}
                  onChange={(event) => setTitle(event.target.value)}
                >
                  <option value="电话跟进">了解需求细节、确认产品规格与报价可行性</option>
                  <option value="推进报价确认">推进报价确认与合同签订</option>
                  <option value="售后与续约">处理售后问题与续约</option>
                </Select>
              </Field>

              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">跟进清单</Label>
                <ul className="space-y-2">
                  {checklistSeed.map((item, i) => (
                    <li key={item}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            checked[i] ? "border-primary bg-primary text-primary-foreground" : "border-input"
                          }`}
                        >
                          {checked[i] ? <Check size={12} /> : null}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked[i]}
                          disabled={submitting}
                          onChange={() => toggle(i)}
                        />
                        <span className={checked[i] ? "text-muted-foreground line-through" : ""}>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <Field label="任务描述">
                <textarea
                  value={desc}
                  disabled={submitting}
                  onChange={(e) => setDesc(e.target.value.slice(0, 500))}
                  className="h-24 w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="补充任务说明…"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">{desc.length} / 500</div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="优先级" required>
                  <Select
                    value={priority}
                    disabled={submitting}
                    onChange={(event) => setPriority(event.target.value as "high" | "medium" | "low")}
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </Select>
                </Field>
                <Field label="截止日期" required>
                  <Input
                    type="date"
                    value={dueDate}
                    disabled={submitting}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </Field>
                <Field label="时间">
                  <Input
                    type="time"
                    value={dueTime}
                    disabled={submitting}
                    onChange={(event) => setDueTime(event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" asChild>
              <Link href={backHref}>取消</Link>
            </Button>
            <Button
              variant="default"
              leftIcon={<CheckCircle2 size={16} />}
              disabled={!canSubmit}
              onClick={() => void handleCreate()}
            >
              {submitting ? "创建中…" : "创建任务"}
            </Button>
          </div>
        </div>

        <div className="w-full space-y-6 lg:w-[45%]">
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardTitle
              action={
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw size={14} /> 参考建议
                </span>
              }
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> AI 跟进建议
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">以下为通用跟进话术参考，不会写入后端。</p>

            <div className="mt-4 text-xs font-medium text-muted-foreground">推荐跟进策略</div>
            <div className="mt-2 space-y-2">
              {followUpStrategies.map((s) => (
                <details key={s} className="group rounded-control border border-border bg-background p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground">
                    <span className="flex-1 truncate">{s}</span>
                    <ChevronRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">
                    建议结合客户过往问询内容，自然引出该问题以推进需求确认。
                  </p>
                </details>
              ))}
            </div>

            <div className="mt-4 text-xs font-medium text-muted-foreground">下一步行动建议</div>
            <div className="mt-2 space-y-2">
              {nextActions.map((a) => (
                <details key={a.title} className="group rounded-control border border-border bg-background p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground">
                    {a.icon}
                    <span className="flex-1 font-medium">{a.title}</span>
                    <ChevronRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">{a.body}</p>
                </details>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Lightbulb size={16} className="text-warning" /> 关联询盘摘要
              </span>
            </CardTitle>
            {selectedInquiry ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">客户</span>
                  <span className="font-medium">{selectedInquiry.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">意向</span>
                  <Badge variant="secondary">{selectedInquiry.intentLevel}</Badge>
                </div>
                <p className="rounded-control border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  {selectedInquiry.summary?.trim() || "暂无需求摘要"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">选择询盘后可查看摘要。</p>
            )}
          </Card>
        </div>
      </div>
    </ConsolePage>
  );
}
