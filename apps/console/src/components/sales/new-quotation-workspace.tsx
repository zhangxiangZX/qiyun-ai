"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge, Button, Input, Label, Select } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createInquiryOnApi,
  createQuoteOpportunity,
  listInquiries,
} from "@/lib/sales/api";
import type { InquiryListItem } from "@/lib/sales/types";

import { QuoteTemplatePicker } from "@/components/quotes/quote-template-picker";
import { FileText } from "lucide-react";

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const fmt = (v: number) =>
  v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
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
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------- */

interface ProductRow {
  id: string;
  name: string;
  model: string;
  unit: string;
  qty: number;
  price: number;
  discount: number;
}

/* ----------------------------------------------------------------------------
 * Workspace
 * ------------------------------------------------------------------------- */

export function NewQuotationWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<ProductRow[]>([
    { id: "1", name: "", model: "", unit: "台", qty: 1, price: 0, discount: 0 },
  ]);

  const [freight, setFreight] = useState(0);
  const [install, setInstall] = useState(0);
  const [other, setOther] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    setListLoading(true);
    void listInquiries({ status: "open", limit: 100 })
      .then((items) => {
        setInquiries(items);
        setListError(null);
        if (items[0]) {
          setSelectedInquiryId(items[0].id);
          setCustomerName(items[0].customerName);
          setContactName(items[0].customerContact ?? "");
        }
      })
      .catch((error) => {
        setInquiries([]);
        setListError(getApiErrorMessage(error, "询盘列表加载失败，请稍后重试。"));
      })
      .finally(() => setListLoading(false));
  }, []);

  const handleCreateQuote = async () => {
    if (submitting) return;
    if (!customerName.trim()) {
      setSubmitError("请填写客户名称。");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      let inquiryId = selectedInquiryId;
      if (!inquiryId) {
        const inquiry = await createInquiryOnApi({
          customerName: customerName.trim() || "新客户",
          summary: `${customerName.trim()} 新建报价`,
        });
        inquiryId = inquiry.id;
      }
      const quote = await createQuoteOpportunity({
        inquiryId,
        title: `${customerName.trim()} 报价方案`,
        estimatedAmount: Math.round(total),
        templateId: appliedTemplateId,
      });
      router.push(`/dashboard/quotes/${quote.id}`);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "生成报价失败，请稍后重试。"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateRow = (id: string, patch: Partial<ProductRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: `new-${prev.length + 1}`, name: "", model: "", unit: "台", qty: 1, price: 0, discount: 0 },
    ]);

  const subtotal = rows.reduce((s, r) => s + r.qty * r.price * (1 - r.discount / 100), 0);
  const taxRate = 0.13;
  const taxable = subtotal + freight + install + other;
  const tax = taxable * taxRate;
  const total = taxable + tax;

  const aiSuggestions = [
    { icon: <CheckCircle2 size={16} />, title: "成交健康度", body: "根据此类报价 12% 的历史成交率" },
    { icon: <CheckCircle2 size={16} />, title: "利润空间", body: "利润率符合市场水平，可维持竞争力" },
    { icon: <CheckCircle2 size={16} />, title: "成交概率", body: "历史数据参考，预计成交概率 72%" },
  ];

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="新建报价" />
        {listError ? <ConsoleRequestError message={listError} /> : null}
        {submitError ? <ConsoleRequestError message={submitError} /> : null}
      </ConsolePageAlerts>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={12} /> 返回报价列表
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" leftIcon={<Sparkles size={16} />}>
            AI 报价建议
          </Button>
          <Button variant="outline" leftIcon={<FileText size={16} />} onClick={() => setPickerOpen(true)}>
            {appliedTemplate ?? "选择模板"}
          </Button>
        </div>
      </div>
      {appliedTemplateId ? (
        <p className="mt-2 text-xs text-muted-foreground">
          已选择模板「{appliedTemplate}」，生成报价时将一并提交 templateId。
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Left ~28% */}
        <div className="w-full lg:w-[28%]">
          <Card>
            <CardTitle>客户信息</CardTitle>
            <div className="space-y-4">
              <Field label="关联询盘">
                <Select
                  value={selectedInquiryId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedInquiryId(nextId);
                    const inquiry = inquiries.find((item) => item.id === nextId);
                    if (inquiry) {
                      setCustomerName(inquiry.customerName);
                      setContactName(inquiry.customerContact ?? "—");
                    }
                  }}
                >
                  <option value="">新建询盘并报价</option>
                  {inquiries.map((inquiry) => (
                    <option key={inquiry.id} value={inquiry.id}>
                      {inquiry.customerName} · {inquiry.id.slice(0, 8)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="客户" required>
                <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              </Field>
              <Field label="联系人" required>
                <Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
              </Field>
              <Field label="联系电话">
                <Input placeholder="选填" />
              </Field>
              <Field label="邮箱">
                <Input placeholder="选填" />
              </Field>
              <details className="group">
                <summary className="cursor-pointer list-none text-xs text-primary hover:underline">
                  更多信息 ▾
                </summary>
                <div className="mt-3 space-y-4">
                  <Field label="客户等级">
                    <Select defaultValue="a">
                      <option value="a">A 类重点客户</option>
                      <option value="b">B 类潜力客户</option>
                      <option value="c">C 类普通客户</option>
                    </Select>
                  </Field>
                  <Field label="所属行业">
                    <Input placeholder="如：智能制造" />
                  </Field>
                </div>
              </details>
              <Link href="#" className="inline-block text-xs text-primary hover:underline">
                更多客户资料
              </Link>
            </div>
          </Card>
        </div>

        {/* Center ~45% */}
        <div className="w-full space-y-6 lg:w-[45%]">
          <Card>
            <CardTitle>报价信息</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="报价单号" required>
                <div className="relative">
                  <Input placeholder={listLoading ? "加载中…" : "保存后由系统生成"} disabled className="pr-9" />
                </div>
              </Field>
              <Field label="报价日期" required>
                <Input type="date" />
              </Field>
              <Field label="报价有效期" required>
                <Input type="date" />
              </Field>
              <Field label="报价人">
                <Input placeholder="当前登录用户" />
              </Field>
              <Field label="币种" required>
                <Select defaultValue="cny">
                  <option value="cny">人民币（CNY）</option>
                  <option value="usd">美元（USD）</option>
                  <option value="eur">欧元（EUR）</option>
                </Select>
              </Field>
              <Field label="税率">
                <Select defaultValue="13">
                  <option value="13">13%（含增值税专用发票）</option>
                  <option value="6">6%（含增值税专用发票）</option>
                  <option value="0">不含税</option>
                </Select>
              </Field>
              <Field label="含税率" required>
                <Select defaultValue="tax">
                  <option value="tax">含税</option>
                  <option value="notax">未税</option>
                </Select>
              </Field>
              <Field label="汇率（CNY）">
                <Input defaultValue="1.0000" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" leftIcon={<Plus size={14} />}>
                    添加产品
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<Plus size={14} />}>
                    添加服务
                  </Button>
                  <Button size="sm" variant="outline" type="button" disabled title="批量导入暂未开放">
                    批量导入
                  </Button>
                  <Button size="sm" variant="outline" type="button" disabled title="从模板导入暂未开放">
                    ← 从模板导入
                  </Button>
                  <button className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                    <Trash2 size={14} /> 清空
                  </button>
                </div>
              }
            >
              产品明细
            </CardTitle>

            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">产品名称</th>
                    <th className="px-2 py-2 font-medium">规格型号</th>
                    <th className="px-2 py-2 font-medium">单位</th>
                    <th className="px-2 py-2 font-medium">数量</th>
                    <th className="px-2 py-2 font-medium">单价(元)</th>
                    <th className="px-2 py-2 font-medium">折扣(%)</th>
                    <th className="px-2 py-2 font-medium">折后(元)</th>
                    <th className="px-2 py-2 font-medium">小计(元)</th>
                    <th className="px-2 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const after = r.qty * r.price * (1 - r.discount / 100);
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <Input value={r.name} onChange={(e) => updateRow(r.id, { name: e.target.value })} className="h-9 w-28" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={r.model} onChange={(e) => updateRow(r.id, { model: e.target.value })} className="h-9 w-24" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={r.unit} onChange={(e) => updateRow(r.id, { unit: e.target.value })} className="h-9 w-12" />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={r.qty}
                            onChange={(e) => updateRow(r.id, { qty: Number(e.target.value) })}
                            className="h-9 w-16 text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={r.price}
                            onChange={(e) => updateRow(r.id, { price: Number(e.target.value) })}
                            className="h-9 w-24 text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={r.discount}
                            onChange={(e) => updateRow(r.id, { discount: Number(e.target.value) })}
                            className="h-9 w-16 text-right"
                          />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(after)}</td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(after)}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <button className="text-muted-foreground hover:text-primary" aria-label="编辑">
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => removeRow(r.id)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus size={14} /> 添加更多
            </button>
          </Card>

          <Card>
            <CardTitle>费用项</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="运费（元）">
                <Input type="number" value={freight} onChange={(e) => setFreight(Number(e.target.value))} />
              </Field>
              <Field label="安装调试费（元）">
                <Input type="number" value={install} onChange={(e) => setInstall(Number(e.target.value))} />
              </Field>
              <Field label="其他费用（元）">
                <Input type="number" value={other} onChange={(e) => setOther(Number(e.target.value))} />
              </Field>
              <Field label="费用说明">
                <Input placeholder="如：远程实施差旅" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>备注信息</CardTitle>
            <textarea
              className="h-24 w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="请输入报价备注说明…"
              maxLength={300}
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">0 / 300</div>
          </Card>

          <Card>
            <CardTitle>附件</CardTitle>
            <Button
              variant="outline"
              leftIcon={<Upload size={14} />}
              type="button"
              disabled
              title="附件上传暂未开放"
            >
              上传附件
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">支持格式：PDF / Word / Excel / 图片，单文件不超过 20MB。</p>
          </Card>
        </div>

        {/* Right ~27% */}
        <div className="w-full space-y-6 lg:w-[27%]">
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardTitle
              action={
                <button className="text-muted-foreground hover:text-primary" aria-label="刷新建议">
                  <RefreshCw size={14} />
                </button>
              }
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> AI 报价建议
              </span>
            </CardTitle>
            <div className="mb-3 flex items-center gap-1 text-warning">
              {"★★★★☆".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
              <span className="ml-2 text-xs font-medium text-foreground">良好</span>
            </div>
            <ul className="space-y-3">
              {aiSuggestions.map((s) => (
                <li key={s.title} className="flex gap-2">
                  <span className="mt-0.5 text-success">{s.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-primary/40 bg-primary/[0.03]">
            <CardTitle>金额汇总</CardTitle>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">商品小计</dt>
                <dd className="font-medium tabular-nums">¥{fmt(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">运费</dt>
                <dd className="font-medium tabular-nums">¥{fmt(freight)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">安装调试费</dt>
                <dd className="font-medium tabular-nums">¥{fmt(install)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">其他费用</dt>
                <dd className="font-medium tabular-nums">¥{fmt(other)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">折扣（13%）</dt>
                <dd className="font-medium tabular-nums">¥{fmt(tax)}</dd>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex items-center justify-between">
                <dt className="font-semibold">报价总额（含税）</dt>
                <dd className="text-xl font-bold text-primary tabular-nums">¥{fmt(total)}</dd>
              </div>
              <div className="rounded-control border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                大写：人民币柒万零玖佰陆拾肆元整
              </div>
            </dl>
          </Card>

          <Card>
            <CardTitle>附件</CardTitle>
            <Button
              variant="outline"
              leftIcon={<Upload size={14} />}
              type="button"
              disabled
              title="附件上传暂未开放"
            >
              上传附件
            </Button>
          </Card>

          <div className="flex flex-col gap-2">
            <Button variant="default" onClick={() => void handleCreateQuote()} disabled={submitting}>
              {submitting ? "生成中…" : "生成报价"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                disabled
                title="请先生成报价，再在详情页打开 PDF 预览"
              >
                预览报价
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled
                title="草稿保存接口尚未开放；当前仅支持直接生成报价"
              >
                保存草稿
              </Button>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/quotes">取消</Link>
            </Button>
          </div>
        </div>
      </div>

      <QuoteTemplatePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(tpl) => {
          setAppliedTemplate(tpl.templateName);
          setAppliedTemplateId(tpl.id);
          setPickerOpen(false);
        }}
      />
    </ConsolePage>
  );
}
