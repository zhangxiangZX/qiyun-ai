"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  Pencil,
  Plus,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { Badge, Button, Input, Select } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getQuoteOpportunity, listQuoteAttachments, saveQuoteDocumentVersion, updateQuoteOpportunity, uploadQuoteAttachment, downloadQuoteAttachment } from "@/lib/sales/api";
import type { QuoteAttachmentItem, QuoteDetail } from "@/lib/sales/types";

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const usd = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DiffRow({ label, from, to, delta }: { label: string; from: string; to: string; delta: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 tabular-nums">
        <span className="text-muted-foreground line-through decoration-muted-foreground/50">{from}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium text-foreground">{to}</span>
        <span className="inline-flex items-center rounded-full bg-success/10 px-1.5 text-xs font-medium text-success">
          ↓ {delta}
        </span>
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

interface DetailRow {
  id: string;
  name: string;
  model: string;
  qty: number;
  unit: string;
  price: number;
  discount: number;
  lead: string;
}

function rowSubtotal(row: DetailRow) {
  return row.qty * row.price * (1 - row.discount / 100);
}

function emptyRow(seed = Date.now()): DetailRow {
  return {
    id: `row-${seed}`,
    name: "",
    model: "",
    qty: 1,
    unit: "台",
    price: 0,
    discount: 0,
    lead: "",
  };
}

const terms = [
  { label: "交付方式", value: "按合同约定", editable: true },
  { label: "付款条件", value: "30% 预付款，发货前付清余款", editable: true },
  { label: "付款账期", value: "按合同约定", editable: true },
  { label: "有效期", value: "报价发出后 30 天", editable: true },
  { label: "质量保证", value: "验收合格之日起 12 个月", editable: true },
];

/* ----------------------------------------------------------------------------
 * Workspace
 * ------------------------------------------------------------------------- */

export function QuotationEditWorkspace() {
  const params = useParams<{ id: string }>();
  const quoteId = params.id;
  const [comment, setComment] = useState("");
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotedAmount, setQuotedAmount] = useState<number | null>(null);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([emptyRow()]);
  const [freight, setFreight] = useState(0);
  const [install, setInstall] = useState(0);
  const [other, setOther] = useState(0);
  const [taxRate, setTaxRate] = useState(0.13);
  const [attachments, setAttachments] = useState<QuoteAttachmentItem[]>([]);

  const load = useCallback(async () => {
    if (!quoteId) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, attachmentRows] = await Promise.all([
        getQuoteOpportunity(quoteId),
        listQuoteAttachments(quoteId).catch(() => [] as QuoteAttachmentItem[]),
      ]);
      setQuote(detail);
      setQuotedAmount(detail.quotedAmount ?? detail.estimatedAmount ?? null);
      const items = detail.details?.lineItems ?? [];
      setDetailRows(
        items.length > 0
          ? items.map((item, index) => ({
              id: item.id ?? `row-${index}`,
              name: item.name,
              model: item.model ?? "",
              qty: item.qty,
              unit: item.unit ?? "台",
              price: item.price,
              discount: item.discount ?? 0,
              lead: item.deliveryCycle ?? "",
            }))
          : [emptyRow()],
      );
      setFreight(detail.details?.freight ?? 0);
      setInstall(detail.details?.install ?? 0);
      setOther(detail.details?.other ?? 0);
      setTaxRate(detail.details?.taxRate ?? 0.13);
      setComment(detail.details?.remark ?? "");
      setAttachments(attachmentRows);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "加载报价失败。"));
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const subtotal = detailRows.reduce((sum, row) => sum + rowSubtotal(row), 0);
  const taxable = subtotal + freight + install + other;
  const tax = taxable * taxRate;
  const computedTotal = taxable + tax;
  const displayAmount = quotedAmount ?? computedTotal;

  const updateRow = (id: string, patch: Partial<DetailRow>) => {
    setDetailRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleSave = async () => {
    if (!quoteId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const details = {
        lineItems: detailRows
          .filter((row) => row.name.trim())
          .map((row) => ({
            id: row.id,
            name: row.name.trim(),
            model: row.model.trim() || undefined,
            qty: row.qty,
            unit: row.unit,
            price: row.price,
            discount: row.discount,
            deliveryCycle: row.lead.trim() || undefined,
          })),
        freight,
        install,
        other,
        taxRate,
        remark: comment.trim() || undefined,
        attachmentIds: attachments.map((item) => item.id),
      };
      const updated = await updateQuoteOpportunity(quoteId, {
        quotedAmount: quotedAmount ?? Math.round(computedTotal),
        estimatedAmount: Math.round(computedTotal),
        title: quote?.title,
        details,
      });
      setQuote(updated);
      setQuotedAmount(updated.quotedAmount ?? updated.estimatedAmount ?? null);
      setNotice("报价明细、费用与金额已保存。");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "保存报价失败。"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!quoteId || savingVersion) return;
    setSavingVersion(true);
    setError(null);
    setNotice(null);
    try {
      const version = await saveQuoteDocumentVersion(quoteId, {
        label: `${quote?.title ?? "报价"}-V${Date.now().toString().slice(-4)}`,
      });
      setNotice(`已另存版本 V${version.version}（${version.fileName}）。可在详情页文档列表下载。`);
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "另存版本失败。"));
    } finally {
      setSavingVersion(false);
    }
  };

  const handleUploadAttachment = async (file: File | null) => {
    if (!quoteId || !file || uploading) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const uploaded = await uploadQuoteAttachment(quoteId, file);
      setAttachments((prev) => [uploaded, ...prev]);
      setNotice(`已上传附件：${uploaded.fileName}`);
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, "附件上传失败。"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="报价编辑" />
        {error ? <ConsoleRequestError message={error} onRetry={() => void load()} /> : null}
        {notice ? (
          <div className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {notice}
          </div>
        ) : null}
      </ConsolePageAlerts>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={12} /> 返回报价列表
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              报价单号 {quote?.id.slice(0, 12).toUpperCase() ?? "—"}
            </span>
            <Badge variant="warning">{quote?.stageLabel ?? "待发送"}</Badge>
            <button className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              V2
              <span className="text-success/70">当前版本</span>
              <ChevronDown size={12} />
            </button>
            <span className="text-xs text-muted-foreground">
              更新于 {quote?.updatedAt ? new Date(quote.updatedAt).toLocaleString("zh-CN") : "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" leftIcon={<Pencil size={16} />} onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "保存中…" : "保存修改"}
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download size={16} />}
            type="button"
            disabled={savingVersion || loading || !quoteId}
            loading={savingVersion}
            onClick={() => void handleSaveVersion()}
          >
            {savingVersion ? "另存中…" : "另存版本"}
          </Button>
          <Button
            variant="outline"
            leftIcon={<Send size={16} />}
            asChild
          >
            <Link href={quoteId ? `/dashboard/quotes/${quoteId}` : "/dashboard/quotes"}>
              去详情发送
            </Link>
          </Button>
          <Button variant="outline" leftIcon={<Eye size={16} />} asChild>
            <Link href={quoteId ? `/dashboard/quotes/${quoteId}/preview` : "/dashboard/quotes"}>
              PDF 预览
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Left ~32% - 客户信息 (read-only) */}
        <div className="w-full lg:w-[32%]">
          <Card>
            <CardTitle>客户信息</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">客户名 *</div>
                <div className="mt-1 flex items-center justify-between gap-2 rounded-control border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                  {quote?.customerName ?? "—"}
                </div>
              </div>
              <ReadField label="联系人 *" value={quote?.customerContact ?? "—"} />
              <ReadField label="币种 *" value="CNY" />
            </div>
          </Card>
        </div>

        {/* Center ~42% - 报价明细 + 条款 */}
        <div className="w-full space-y-6 lg:w-[42%]">
          <Card>
            <CardTitle
              action={
                <Button
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  type="button"
                  onClick={() => setDetailRows((prev) => [...prev, emptyRow(Date.now() + prev.length)])}
                >
                  添加产品
                </Button>
              }
            >
              报价明细（{detailRows.filter((row) => row.name.trim()).length} 项）
            </CardTitle>

            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">产品名称</th>
                    <th className="px-2 py-2 font-medium">规格型号</th>
                    <th className="px-2 py-2 text-right font-medium">数量</th>
                    <th className="px-2 py-2 font-medium">单位</th>
                    <th className="px-2 py-2 text-right font-medium">单价(CNY)</th>
                    <th className="px-2 py-2 text-right font-medium">折扣(%)</th>
                    <th className="px-2 py-2 text-right font-medium">小计(CNY)</th>
                    <th className="px-2 py-2 font-medium">交期</th>
                    <th className="px-2 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((r, idx) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <Input
                          className="h-8 min-w-[120px]"
                          value={r.name}
                          onChange={(event) => updateRow(r.id, { name: event.target.value })}
                          placeholder="产品名称"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          className="h-8 min-w-[100px]"
                          value={r.model}
                          onChange={(event) => updateRow(r.id, { model: event.target.value })}
                          placeholder="型号"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          className="h-8 w-20 text-right"
                          value={r.qty}
                          onChange={(event) => updateRow(r.id, { qty: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          className="h-8 w-16"
                          value={r.unit}
                          onChange={(event) => updateRow(r.id, { unit: event.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          className="h-8 w-28 text-right"
                          value={r.price}
                          onChange={(event) => updateRow(r.id, { price: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          className="h-8 w-20 text-right"
                          value={r.discount}
                          onChange={(event) => updateRow(r.id, { discount: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums">
                        {rowSubtotal(r).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          className="h-8 w-24"
                          value={r.lead}
                          onChange={(event) => updateRow(r.id, { lead: event.target.value })}
                          placeholder="交期"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="删除"
                          onClick={() =>
                            setDetailRows((prev) =>
                              prev.length <= 1 ? [emptyRow()] : prev.filter((row) => row.id !== r.id),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-xs text-muted-foreground">
                运费
                <Input
                  type="number"
                  className="mt-1 h-8"
                  value={freight}
                  onChange={(event) => setFreight(Number(event.target.value) || 0)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                安装
                <Input
                  type="number"
                  className="mt-1 h-8"
                  value={install}
                  onChange={(event) => setInstall(Number(event.target.value) || 0)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                其他
                <Input
                  type="number"
                  className="mt-1 h-8"
                  value={other}
                  onChange={(event) => setOther(Number(event.target.value) || 0)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                税率
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1 h-8"
                  value={taxRate}
                  onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
                />
              </label>
            </div>
          </Card>

          <Card>
            <CardTitle
              action={
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading || !quoteId}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      void handleUploadAttachment(file);
                    }}
                  />
                  <Button size="sm" variant="outline" leftIcon={<Plus size={14} />} disabled={uploading} asChild>
                    <span>{uploading ? "上传中…" : "上传附件"}</span>
                  </Button>
                </label>
              }
            >
              相关附件
            </CardTitle>
            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无附件。可上传图纸、清单等（≤20MB）。</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-control border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{item.fileName}</div>
                      <div className="text-xs text-muted-foreground">
                        {(item.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => void downloadQuoteAttachment(quoteId!, item.id, item.fileName)}
                    >
                      下载
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>交易与付款条款</CardTitle>
            <dl className="space-y-3">
              {terms.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                >
                  <dt className="shrink-0 text-xs text-muted-foreground">{t.label}</dt>
                  <dd className="text-right text-sm text-foreground">{t.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardTitle>备注</CardTitle>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="保存到报价明细备注…"
            />
          </Card>
        </div>

        {/* Right ~26% - 版本对比 + 价格汇总 */}
        <div className="w-full space-y-6 lg:w-[26%]">
          <Card>
            <CardTitle>版本与历史</CardTitle>
            <div className="space-y-3">
              <details open className="rounded-control border border-success/30 bg-success/5 p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm">
                  <Badge variant="success">V2 当前版</Badge>
                  <span className="text-xs text-muted-foreground">编辑产品折扣 →</span>
                </summary>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>创建时间：2024-06-14 16:20</div>
                  <div>更新人：张伟</div>
                  <div>更新：编辑产品折扣</div>
                </div>
              </details>
              <details className="rounded-control border border-border bg-muted/20 p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm">
                  <Badge variant="secondary">V1</Badge>
                  <span className="text-xs text-muted-foreground">初始版本 →</span>
                </summary>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>创建时间：2024-06-01 10:30</div>
                  <div>更新人：张伟</div>
                  <div>初始：初始版本</div>
                </div>
              </details>
            </div>
          </Card>

          <Card>
            <CardTitle>版本对比</CardTitle>
            <div className="flex items-center gap-2">
              <Select defaultValue="v2" className="flex-1">
                <option value="v2">V2（当前）</option>
                <option value="v1">V1</option>
              </Select>
              <span className="text-muted-foreground">vs</span>
              <Select defaultValue="v1" className="flex-1">
                <option value="v1">V1</option>
                <option value="v2">V2</option>
              </Select>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">主要变更</div>
              <DiffRow label="商品小计" from="19,015.00" to="18,030.00" delta="985.00" />
              <DiffRow label="折后金额" from="0.00" to="985.00" delta="985.00" />
              <DiffRow label="总计" from="19,015.00" to="18,030.00" delta="985.00" />
            </div>

            <div className="mt-4 rounded-control border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              * 第 1 项：工业物联网网关，折价 0% → 5%
            </div>

            <button className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Eye size={14} /> 查看完整对比
            </button>
          </Card>

          <Card className="border-primary/40 bg-primary/[0.03]">
            <CardTitle>价格汇总</CardTitle>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">报价金额</dt>
                <dd>
                  <Input
                    type="number"
                    className="h-9 w-36 text-right"
                    value={quotedAmount ?? ""}
                    onChange={(event) =>
                      setQuotedAmount(event.target.value ? Number(event.target.value) : null)
                    }
                  />
                </dd>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex items-center justify-between">
                <dt className="font-semibold">总计</dt>
                <dd className="text-xl font-bold text-primary tabular-nums">
                  ¥{(displayAmount ?? 0).toLocaleString("zh-CN")}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </ConsolePage>
  );
}
