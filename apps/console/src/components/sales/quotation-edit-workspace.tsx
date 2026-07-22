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
import { getQuoteOpportunity, updateQuoteOpportunity } from "@/lib/sales/api";
import type { QuoteDetail } from "@/lib/sales/types";

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
 * Mock data
 * ------------------------------------------------------------------------- */

interface DetailRow {
  id: string;
  name: string;
  model: string;
  qty: number;
  unit: string;
  price: number;
  discount: number;
  subtotal: number;
  lead: string;
}

const defaultDetailRows: DetailRow[] = [
  { id: "1", name: "工业物联网网关", model: "IGW-2000", qty: 10, unit: "台", price: 1250, discount: 5, subtotal: 11875, lead: "15 天" },
  { id: "2", name: "温湿度传感器", model: "THS-100", qty: 20, unit: "个", price: 85, discount: 5, subtotal: 1700, lead: "7 天" },
  { id: "3", name: "数据库模块模组", model: "DAQ-500", qty: 10, unit: "台", price: 320, discount: 5, subtotal: 3040, lead: "10 天" },
  { id: "4", name: "云平台软件", model: "Cloud Platform Pro", qty: 1, unit: "套", price: 2400, discount: 0, subtotal: 2400, lead: "—" },
];

const terms = [
  { label: "交付方式", value: "FOB Los Angeles", editable: true },
  { label: "付款条件", value: "30% 预付款，15% 工作日内", editable: true },
  { label: "付款账期", value: "30% 验收后，70% 发货前付清", editable: true },
  { label: "有效期", value: "2024-07-01", editable: true },
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
  const [error, setError] = useState<string | null>(null);
  const [quotedAmount, setQuotedAmount] = useState<number | null>(null);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [freightAmount, setFreightAmount] = useState(0);
  const [installationAmount, setInstallationAmount] = useState(0);
  const [otherAmount, setOtherAmount] = useState(0);

  const load = useCallback(async () => {
    if (!quoteId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getQuoteOpportunity(quoteId);
      setQuote(detail);
      setQuotedAmount(detail.quotedAmount ?? detail.estimatedAmount ?? null);
      setDetailRows(
        detail.lineItems?.length
          ? detail.lineItems.map((item, index) => ({
              id: `${index + 1}`,
              name: item.name,
              model: item.model,
              qty: item.qty,
              unit: item.unit,
              price: item.price,
              discount: item.discount,
              subtotal: item.qty * item.price * (1 - item.discount / 100),
              lead: item.deliveryCycle ?? "—",
            }))
          : defaultDetailRows,
      );
      setTaxRate(detail.taxRate ?? 0);
      setFreightAmount(detail.freightAmount ?? 0);
      setInstallationAmount(detail.installationAmount ?? 0);
      setOtherAmount(detail.otherAmount ?? 0);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "加载报价失败。"));
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!quoteId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateQuoteOpportunity(quoteId, {
        quotedAmount,
        title: quote?.title,
        lineItems: detailRows.map(({ name, model, unit, qty, price, discount, lead }) => ({
          name,
          model,
          unit,
          qty,
          price,
          discount,
          deliveryCycle: lead === "—" ? undefined : lead,
        })),
        taxRate,
        freightAmount,
        installationAmount,
        otherAmount,
        currency: quote?.currency ?? "CNY",
      });
      setQuote(updated);
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "保存报价失败。"));
    } finally {
      setSaving(false);
    }
  };

  const rowsSubtotal = detailRows.reduce(
    (sum, row) => sum + row.qty * row.price * (1 - row.discount / 100),
    0,
  );
  const calculatedAmount =
    (rowsSubtotal + freightAmount + installationAmount + otherAmount) * (1 + taxRate);
  const displayAmount = quotedAmount ?? calculatedAmount;

  const updateRow = (id: string, patch: Partial<DetailRow>) => {
    setDetailRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setDetailRows((rows) => [
      ...rows,
      {
        id: `new-${Date.now()}`,
        name: "",
        model: "",
        qty: 1,
        unit: "台",
        price: 0,
        discount: 0,
        subtotal: 0,
        lead: "—",
      },
    ]);
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="报价编辑" />
        {error ? <ConsoleRequestError message={error} onRetry={() => void load()} /> : null}
        <div className="rounded-control border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          产品明细、税率与附加费用会保存到正式报价；发送和附件管理请前往报价详情页。
        </div>
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
          <Button variant="outline" leftIcon={<Download size={16} />} type="button" disabled title="另存版本暂未开放">
            另存版本
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Button size="sm" leftIcon={<Plus size={14} />} onClick={addRow}>
                    添加产品
                  </Button>
                  <Button size="sm" variant="outline">
                    批量编辑
                  </Button>
                  <Button size="sm" variant="outline">
                    导入
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<Download size={14} />}>
                    导出
                  </Button>
                </div>
              }
            >
              报价明细（{detailRows.length} 项）
              <Badge variant="success" className="ml-2">V2</Badge>
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
                    <th className="px-2 py-2 text-right font-medium">单价(USD)</th>
                    <th className="px-2 py-2 text-right font-medium">折扣(%)</th>
                    <th className="px-2 py-2 text-right font-medium">小计(USD)</th>
                    <th className="px-2 py-2 font-medium">交期</th>
                    <th className="px-2 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((r, idx) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-2 py-2"><Input className="h-8 min-w-28" value={r.name} onChange={(event) => updateRow(r.id, { name: event.target.value })} /></td>
                      <td className="px-2 py-2"><Input className="h-8 min-w-24" value={r.model} onChange={(event) => updateRow(r.id, { model: event.target.value })} /></td>
                      <td className="px-2 py-2"><Input className="h-8 w-16 text-right" type="number" value={r.qty} onChange={(event) => updateRow(r.id, { qty: Number(event.target.value) })} /></td>
                      <td className="px-2 py-2"><Input className="h-8 w-14" value={r.unit} onChange={(event) => updateRow(r.id, { unit: event.target.value })} /></td>
                      <td className="px-2 py-2"><Input className="h-8 w-24 text-right" type="number" value={r.price} onChange={(event) => updateRow(r.id, { price: Number(event.target.value) })} /></td>
                      <td className="px-2 py-2"><Input className="h-8 w-20 text-right" type="number" value={r.discount} onChange={(event) => updateRow(r.id, { discount: Number(event.target.value) })} /></td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums">{(r.qty * r.price * (1 - r.discount / 100)).toLocaleString("en-US")}</td>
                      <td className="px-2 py-2"><Input className="h-8 w-20" value={r.lead} onChange={(event) => updateRow(r.id, { lead: event.target.value })} /></td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button className="text-muted-foreground hover:text-primary" aria-label="编辑">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => setDetailRows((rows) => rows.filter((row) => row.id !== r.id))} className="text-muted-foreground hover:text-destructive" aria-label="删除">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus size={14} /> 添加备注（可附于可见）
            </button>
          </Card>

          <Card>
            <CardTitle action={<Button size="sm" variant="outline" leftIcon={<Pencil size={14} />}>编辑</Button>}>
              交易与付款条款
            </CardTitle>
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
            <CardTitle>备注与条件（客户可见）</CardTitle>
            <textarea
              className="h-20 w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="请输入意见或备注…"
            />
          </Card>

          <Card>
            <CardTitle>内部审批与评论</CardTitle>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                张
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">张伟</span>
                  <Badge variant="secondary">创建人</Badge>
                  <span className="text-xs text-muted-foreground">2024-06-14 16:20</span>
                </div>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="添加评论或审批意见…"
                />
              </div>
            </div>
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
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  税率（小数）
                  <Input className="mt-1 h-8" type="number" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} />
                </label>
                <label className="text-xs text-muted-foreground">
                  运费
                  <Input className="mt-1 h-8" type="number" value={freightAmount} onChange={(event) => setFreightAmount(Number(event.target.value))} />
                </label>
                <label className="text-xs text-muted-foreground">
                  安装费
                  <Input className="mt-1 h-8" type="number" value={installationAmount} onChange={(event) => setInstallationAmount(Number(event.target.value))} />
                </label>
                <label className="text-xs text-muted-foreground">
                  其他费用
                  <Input className="mt-1 h-8" type="number" value={otherAmount} onChange={(event) => setOtherAmount(Number(event.target.value))} />
                </label>
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
