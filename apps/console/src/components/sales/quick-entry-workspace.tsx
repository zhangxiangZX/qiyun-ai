"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Lightbulb,
  Phone,
  RefreshCw,
  Save,
  Sparkles,
  MessageCircle,
  Wand2,
  Youtube,
  CalendarDays,
  UserPlus,
  AlertTriangle,
} from "lucide-react";

import { Badge, Button } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { getApiErrorMessage } from "@/lib/api/errors";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import {
  aiExtractQuickEntry,
  checkQuickEntryDuplicate,
  createQuickEntryInquiry,
  listInquiries,
} from "@/lib/sales/api";
import {
  QUICK_ENTRY_FIELD_KEYS,
  buildQuickEntrySummary,
  channelLabelToSourceType,
  formatInquiryDate,
  mapExtractResponseToFields,
  normalizePhone,
  type QuickEntryFieldKey,
} from "@/lib/sales/quick-entry-helpers";
import { INTENT_LABELS, SOURCE_TYPE_LABELS, type InquiryListItem, type IntentLevel } from "@/lib/sales/types";

type Priority = IntentLevel;

/** Single-border focus — avoid border + ring stacking into a double box. */
const FIELD_CONTROL =
  "h-10 w-full rounded-control border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none";

const FIELD_TEXTAREA =
  "w-full resize-none rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none";

const PHONE_GROUP =
  "flex h-10 items-center gap-2 rounded-control border border-input bg-background px-3 shadow-sm transition-colors focus-within:border-primary";

const PHONE_INPUT =
  "min-w-0 w-full border-0 bg-transparent p-0 text-sm shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

const CHANNEL_OPTIONS = [
  "官网表单",
  "销售链接",
  "抖音",
  "展会",
  "微信",
  "老客户推荐",
  "电话呼入",
];

const NEED_OPTIONS = [
  "户外一体化机柜",
  "防水连接器",
  "电源模块",
  "边缘计算网关",
  "机柜空调",
  "储能电池柜",
  "工控平板",
];

const BUDGET_OPTIONS = ["5万以下", "5-10万", "10-20万", "20-50万", "50万以上", "待确认"];

const SOURCE_SHORTCUTS = [
  { label: "电话", icon: Phone, color: "#22c55e", channel: "电话呼入" },
  { label: "微信", icon: MessageCircle, color: "#07c160" },
  { label: "抖音", icon: Youtube, color: "#fe2c55" },
  { label: "展会", icon: CalendarDays, color: "#3b5eff" },
  { label: "老客户推荐", icon: UserPlus, color: "#f97316" },
];

const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  low: { label: "低", className: "bg-muted text-muted-foreground" },
  medium: { label: "中", className: "bg-warning/10 text-warning" },
  high: { label: "高", className: "bg-destructive/10 text-destructive" },
};

const AI_FIELD_KEYS = QUICK_ENTRY_FIELD_KEYS;

function resetFormFields() {
  return {
    customer: "",
    contact: "",
    phone: "",
    channel: "",
    need: "",
    budget: "",
    priority: "medium" as Priority,
    followUp: "",
    remark: "",
    rawText: "",
    extracted: Object.fromEntries(AI_FIELD_KEYS.map((key) => [key, ""])) as Record<
      QuickEntryFieldKey,
      string
    >,
    hasExtracted: false,
  };
}

export function QuickEntryWorkspace() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("");
  const [need, setNeed] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [followUp, setFollowUp] = useState("");
  const [remark, setRemark] = useState("");
  const [keepOpen, setKeepOpen] = useState(true);
  const [rawText, setRawText] = useState("");
  const [extracted, setExtracted] = useState<Record<QuickEntryFieldKey, string>>(() =>
    Object.fromEntries(AI_FIELD_KEYS.map((key) => [key, ""])) as Record<QuickEntryFieldKey, string>,
  );
  const [hasExtracted, setHasExtracted] = useState(false);
  const [extractMode, setExtractMode] = useState<"llm" | "rules" | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [recentEntries, setRecentEntries] = useState<InquiryListItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<{ id: string; customerName: string } | null>(null);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const items = await listInquiries({ status: "open", limit: 8 });
      setRecentEntries(items);
    } catch {
      setRecentEntries([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const checkDuplicate = useCallback(async (value: string) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      setDuplicate(null);
      return;
    }
    try {
      const result = await checkQuickEntryDuplicate(normalized);
      if (result.duplicate && result.match) {
        setDuplicate({
          id: result.match.inquiryId,
          customerName: result.match.customerName,
        });
      } else {
        setDuplicate(null);
      }
    } catch {
      setDuplicate(null);
    }
  }, []);

  const remarkCount = remark.length;
  const rawCount = rawText.length;

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setExtracting(true);
    setActionError(null);
    try {
      const result = await aiExtractQuickEntry(rawText.trim());
      setExtracted(mapExtractResponseToFields(result));
      setHasExtracted(true);
      setExtractMode(result.extractMode === "llm" ? "llm" : "rules");
      setActionMessage(
        result.extractMode === "llm"
          ? "已通过大模型提取字段，请核对后一键应用。"
          : "大模型暂不可用，已使用规则提取；配置 LLM 后可获得更好效果。",
      );
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setActionError("预览模式下无法调用 AI 提取，请配置 API_BASE_URL。");
      } else {
        setActionError(getApiErrorMessage(err, "AI 提取失败，请稍后重试。"));
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleApplyExtracted = () => {
    if (extracted["客户名称"]) setCustomer(extracted["客户名称"]);
    if (extracted["联系人"]) setContact(extracted["联系人"]);
    if (extracted["联系电话"]) setPhone(extracted["联系电话"].replace(/\s/g, ""));
    if (extracted["来源渠道"]) setChannel(extracted["来源渠道"]);
    if (extracted["产品需求"]) setNeed(extracted["产品需求"]);
    if (extracted["预算范围"]) setBudget(extracted["预算范围"]);
    if (extracted["优先级"]?.includes("高")) setPriority("high");
    else if (extracted["优先级"]?.includes("低")) setPriority("low");
    else setPriority("medium");
  };

  const clearDraft = (options?: { preserveActionMessage?: boolean }) => {
    const reset = resetFormFields();
    setCustomer(reset.customer);
    setContact(reset.contact);
    setPhone(reset.phone);
    setChannel(reset.channel);
    setNeed(reset.need);
    setBudget(reset.budget);
    setPriority(reset.priority);
    setFollowUp(reset.followUp);
    setRemark(reset.remark);
    setRawText(reset.rawText);
    setExtracted(reset.extracted);
    setHasExtracted(reset.hasExtracted);
    setExtractMode(null);
    setDuplicate(null);
    setActionError(null);
    if (!options?.preserveActionMessage) {
      setActionMessage(null);
    }
  };

  const saveInquiry = async (createAnother: boolean) => {
    if (!canSave || saving) return;
    setSaving(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const summary = buildQuickEntrySummary({
        customer,
        contact,
        phone,
        channel,
        need,
        budget,
        priority,
        followUp,
        remark,
      });
      const created = await createQuickEntryInquiry({
        customerName: customer.trim(),
        sourceType: channelLabelToSourceType(channel),
        summary,
        customerContact: contact.trim() || undefined,
        phone: normalizePhone(phone) || undefined,
        productNeed: need,
        budget: budget || undefined,
        intentLevel: priority,
        nextActionAt: followUp ? new Date(`${followUp}T09:00:00`).toISOString() : undefined,
        internalRemark: remark.trim() || undefined,
      });
      setActionMessage(`询盘已保存：${created.customerName}`);
      await loadRecent();
      if (createAnother || keepOpen) {
        clearDraft({ preserveActionMessage: true });
      } else {
        router.push(`/dashboard/inquiries/${created.id}`);
      }
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setActionError("预览模式下无法保存询盘，请配置 API_BASE_URL。");
      } else {
        setActionError(getApiErrorMessage(err, "保存失败，请稍后重试。"));
      }
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    customer.trim() !== "" && phone.trim() !== "" && channel !== "" && need !== "";

  const duplicateLabel = useMemo(() => {
    if (!duplicate) return null;
    return `${duplicate.customerName}（${duplicate.id.slice(-8)}）`;
  }, [duplicate]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="AI 快速录入" />
      </ConsolePageAlerts>

      {actionError ? (
        <div className="rounded-control border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-control border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)_minmax(260px,0.85fr)]">
        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">AI 快速录入</h2>
            <Badge variant="info" className="ml-auto">
              AI 增强
            </Badge>
            <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => clearDraft()}>
              清空草稿
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="客户姓名" required>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="如：浙江迅达通信技术有限公司"
                className={FIELD_CONTROL}
              />
            </Field>
            <Field label="联系人">
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="如：李经理"
                className={FIELD_CONTROL}
              />
            </Field>

            <Field label="手机号" required>
              <div className={PHONE_GROUP}>
                <select className="bg-transparent text-sm outline-none focus:outline-none">
                  <option>+86</option>
                  <option>+852</option>
                  <option>+1</option>
                </select>
                <span className="text-muted-foreground">|</span>
                <input
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPhone(value);
                    void checkDuplicate(value);
                  }}
                  placeholder="138 0000 0000"
                  className={PHONE_INPUT}
                />
                <MessageCircle size={16} className="shrink-0 text-[#07c160]" />
              </div>
            </Field>
            <Field label="来源渠道" required>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className={FIELD_CONTROL}
              >
                <option value="">请选择</option>
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="产品需求" required>
              <select
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                className={FIELD_CONTROL}
              >
                <option value="">请选择</option>
                {NEED_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="预算范围">
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={FIELD_CONTROL}
              >
                <option value="">请选择</option>
                {BUDGET_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="优先级">
              <div className="flex items-center gap-2">
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`h-10 flex-1 rounded-control border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:border-primary ${
                      priority === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {PRIORITY_META[p].label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="下次跟进时间">
              <input
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className={FIELD_CONTROL}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="备注信息" required>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="客户初步诉求、关键背景、特殊要求等"
                  className={FIELD_TEXTAREA}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{remarkCount}/1000</p>
              </Field>
            </div>
          </div>

          <label className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            创建后继续录入
          </label>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => clearDraft()}>
              重置
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Save size={16} />}
              disabled={!canSave || saving}
              onClick={() => void saveInquiry(true)}
            >
              保存并新建
            </Button>
            <Button
              disabled={!canSave || saving}
              leftIcon={<Save size={16} />}
              onClick={() => void saveInquiry(false)}
            >
              {saving ? "保存中…" : "保存询盘"}
            </Button>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-card border border-purple-200 bg-purple-50/60 p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-purple-500 text-[10px] font-bold text-white">
                AI
              </span>
              <h2 className="text-base font-semibold text-foreground">AI 辅助整理</h2>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              粘贴邮件、聊天记录等非结构化文本，由大模型提取客户与需求信息（仅整理原文，不编造参数/报价）。
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value.slice(0, 2000))}
              rows={8}
              placeholder="粘贴客户沟通记录、邮件正文、微信聊天内容…"
              className="w-full resize-none rounded-control border border-purple-100 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-purple-400 focus-visible:outline-none"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{rawCount}/2000</p>
            <Button
              className="mt-3 w-full bg-primary hover:bg-primary/90"
              leftIcon={<Wand2 size={16} />}
              onClick={() => void handleExtract()}
              disabled={extracting || !rawText.trim()}
            >
              {extracting ? "大模型提取中…" : "智能提取信息"}
            </Button>
          </section>

          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">AI 提取结果（可编辑）</h2>
                {extractMode === "llm" ? (
                  <Badge variant="success">大模型</Badge>
                ) : extractMode === "rules" ? (
                  <Badge variant="secondary">规则兜底</Badge>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasExtracted}
                onClick={handleApplyExtracted}
              >
                一键应用
              </Button>
            </div>
            <div className="space-y-2">
              {AI_FIELD_KEYS.map((key) => {
                const value = hasExtracted ? (extracted[key] ?? "—") : "—";
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-control border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="shrink-0 text-muted-foreground">{key}</span>
                    {hasExtracted ? (
                      <input
                        value={extracted[key] ?? ""}
                        onChange={(e) =>
                          setExtracted((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="min-w-0 flex-1 bg-transparent text-right font-medium text-foreground outline-none"
                      />
                    ) : (
                      <span className="font-medium text-muted-foreground">{value}</span>
                    )}
                    {hasExtracted && extracted[key] ? (
                      <CheckCircle2 size={14} className="shrink-0 text-success" />
                    ) : hasExtracted ? (
                      <AlertTriangle size={14} className="shrink-0 text-warning" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-2 text-sm font-semibold text-foreground">来源快捷入口</h3>
            <div className="grid grid-cols-3 gap-2">
              {SOURCE_SHORTCUTS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setChannel(s.channel ?? s.label)}
                    className="flex flex-col items-center gap-1.5 rounded-control border border-border bg-muted/20 py-3 text-xs text-foreground transition-colors hover:bg-accent/40"
                  >
                    <Icon size={18} style={{ color: s.color }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`rounded-card border p-4 shadow-card ${
              duplicate ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"
            }`}
          >
            <div className="flex items-center gap-2">
              {duplicate ? (
                <AlertTriangle size={16} className="text-warning" />
              ) : (
                <CheckCircle2 size={16} className="text-success" />
              )}
              <h3 className="text-sm font-semibold text-foreground">重复检测</h3>
              <Badge variant={duplicate ? "warning" : "success"} className="ml-auto">
                {duplicate ? "可能重复" : "无重复"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {duplicate
                ? `发现相似记录：${duplicateLabel}。请确认是否继续录入。`
                : "未发现与现有客户库的重复记录，可安全录入。"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className={`mt-3 w-full ${
                duplicate
                  ? "border-warning/30 text-warning hover:bg-warning/10"
                  : "border-success/30 text-success hover:bg-success/10"
              }`}
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void checkDuplicate(phone)}
            >
              重新检测
            </Button>
          </div>

          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb size={15} className="text-warning" />
              <h3 className="text-sm font-semibold text-foreground">录入小 tips</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• 手机号填写后可自动匹配微信线索</li>
              <li>• 来源选「展会」建议补充展位号</li>
              <li>• 高优先级客户将进入今日跟进清单</li>
              <li>• 备注越完整，AI 提取越准确</li>
            </ul>
          </div>
        </aside>
      </div>

      <section className="mt-4 rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">最近录入记录</h3>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => void loadRecent()}>
              刷新
            </Button>
            <Link href="/dashboard/inquiries" className="text-xs text-primary hover:underline">
              查看全部
            </Link>
          </div>
        </div>
        <div className="overflow-hidden">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">客户名称</th>
                <th className="px-4 py-3 text-left font-medium">来源渠道</th>
                <th className="px-4 py-3 text-left font-medium">优先级</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {recentLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    加载中…
                  </td>
                </tr>
              ) : recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    暂无最近录入记录
                  </td>
                </tr>
              ) : (
                recentEntries.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 transition-colors hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/inquiries/${r.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle size={13} className="text-primary" />
                        {SOURCE_TYPE_LABELS[r.sourceType]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_META[r.intentLevel].className}`}
                      >
                        {INTENT_LABELS[r.intentLevel]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 text-muted-foreground">
                        <Link
                          href={`/dashboard/inquiries/${r.id}`}
                          className="rounded p-1 hover:bg-accent hover:text-foreground"
                          aria-label="查看"
                        >
                          <Eye size={15} />
                        </Link>
                        <span className="text-xs">{formatInquiryDate(r.createdAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </ConsolePage>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}
