"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Pencil,
  ShieldCheck,
  Sparkles,
  Download,
} from "lucide-react";
import { Badge, Button } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getQuoteDocument } from "@/lib/quotes/api";
import type { QuoteDocumentPayload } from "@/lib/quotes/api";

/* ----------------------------------------------------------------------------
 * Types & mock data
 * ------------------------------------------------------------------------- */

interface InfoItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

interface LineItem {
  id: string;
  name: string;
  spec: string;
  cycle: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface TermItem {
  icon: React.ReactNode;
  title: string;
  body: string;
}

interface Attachment {
  name: string;
}

const formatCNY = (v: number) => `¥${v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ----------------------------------------------------------------------------
 * Reusable bits
 * ------------------------------------------------------------------------- */

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-card border border-border bg-card shadow-card ${className ?? ""}`}>{children}</div>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-4 text-base font-semibold text-foreground ${className ?? ""}`}>{children}</h2>;
}

/* ----------------------------------------------------------------------------
 * Workspace
 * ------------------------------------------------------------------------- */

export function CustomerQuotationWorkspace({ quoteId }: { quoteId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [document, setDocument] = useState<QuoteDocumentPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const mode = await fetchConsoleMode().catch(() => null);
        if (mode && isPreviewMode(mode)) {
          setDocument(null);
          return;
        }
        setDocument(await getQuoteDocument(quoteId));
      } catch {
        setDocument(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [quoteId]);

  const infoItems: InfoItem[] = useMemo(() => {
    if (!document) {
      return [
        { icon: <FileText size={18} />, label: "报价单号", value: "QT20240601001" },
        { icon: <Sparkles size={18} />, label: "报价日期", value: "2024-06-01" },
        { icon: <Phone size={18} />, label: "有效期至", value: "2024-06-15", sub: "（14 天）" },
        { icon: <CreditCard size={18} />, label: "币种", value: "人民币（CNY）" },
        { icon: <ShieldCheck size={18} />, label: "报价状态", value: "待确认" },
      ];
    }
    return [
      { icon: <FileText size={18} />, label: "报价单号", value: document.sample.quoteNo },
      { icon: <Sparkles size={18} />, label: "报价日期", value: document.sample.date },
      { icon: <Phone size={18} />, label: "有效期至", value: document.sample.validUntil },
      { icon: <CreditCard size={18} />, label: "币种", value: document.sample.currency },
      { icon: <ShieldCheck size={18} />, label: "报价状态", value: confirmed ? "已确认" : "待确认" },
    ];
  }, [confirmed, document]);

  const lineItems: LineItem[] = useMemo(() => {
    if (!document) {
      return [
        {
          id: "1",
          name: "企云 AI 智能分析平台（标准版）",
          spec: "含全套分析看板和 API 对接管理",
          cycle: "套",
          qty: 1,
          unitPrice: 98000,
          amount: 98000,
        },
        {
          id: "2",
          name: "数据接入服务",
          spec: "支持主流数据源与 API 对接",
          cycle: "套",
          qty: 1,
          unitPrice: 18000,
          amount: 18000,
        },
        {
          id: "3",
          name: "定制化报表开发",
          spec: "根据需求定制开发与展示（2 个看板）",
          cycle: "一次性",
          qty: 1,
          unitPrice: 25000,
          amount: 25000,
        },
        {
          id: "4",
          name: "培训知识与转移",
          spec: "提供搭建及后续交付支持",
          cycle: "一次性",
          qty: 1,
          unitPrice: 8000,
          amount: 8000,
        },
        {
          id: "5",
          name: "技术支持与维护",
          spec: "7×12 小时响应，版本升级支持",
          cycle: "年",
          qty: 1,
          unitPrice: 12000,
          amount: 12000,
        },
      ];
    }
    return document.sample.products.map((product, index) => ({
      id: String(index + 1),
      name: product.name,
      spec: product.model,
      cycle: product.deliveryCycle ?? product.unit,
      qty: product.qty,
      unitPrice: product.price,
      amount: product.amount,
    }));
  }, [document]);

  const terms: TermItem[] = useMemo(() => {
    if (!document) {
      return [
        {
          icon: <CreditCard size={18} />,
          title: "付款与实施",
          body: "私有化部署为 25 个工作日，首付款 30% 后启动开发，验收合格后支付尾款。",
        },
        {
          icon: <ShieldCheck size={18} />,
          title: "付款方式",
          body: "首付款 50% + 预付款，验收后 7 个工作日内支付剩余款项，支持对公转账。",
        },
        {
          icon: <CheckCircle2 size={18} />,
          title: "售后服务",
          body: "提供 1 年免费技术支持，含版本升级、远程排障与专属客户成功经理服务。",
        },
      ];
    }
    return [
      {
        icon: <CreditCard size={18} />,
        title: "有效期",
        body: document.template.terms.validity,
      },
      {
        icon: <ShieldCheck size={18} />,
        title: "付款方式",
        body: document.template.terms.payment,
      },
      {
        icon: <CheckCircle2 size={18} />,
        title: "交付周期",
        body: document.template.terms.delivery,
      },
    ];
  }, [document]);

  const attachments: Attachment[] = [
    { name: "AI 产品介绍.pdf" },
    { name: "方案技术说明.pdf" },
    { name: "服务与支持说明.pdf" },
  ];

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * 0.13);
  const total = subtotal + tax;
  const companyName = document?.sample.company.name ?? "企云 AI 智能增长";
  const customerName = document?.sample.customer.contact ?? "客户";

  if (loading) {
    return (
      <ConsolePage>
        <p className="text-sm text-muted-foreground">加载报价单中…</p>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="客户专属报价" />
      </ConsolePageAlerts>

      {/* Top bar */}
      <div className="flex flex-col gap-3 rounded-card border border-border bg-gradient-to-r from-primary/10 via-primary/[0.04] to-transparent px-6 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles size={18} className="text-primary" />
          企云 AI 智能增长：{companyName}
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Phone size={14} className="text-primary" />
          400-888-1234
          <span className="text-border">|</span>
          <span>工作日 9:00-18:00</span>
        </div>
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">您的专属报价</h1>
            <Badge variant="default">正式报价</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            您好{customerName ? `，${customerName}` : ""}，感谢您对企云 AI 产品与服务的关注。我们根据您的需求为您定制了如下方案，期待与您携手共创价值。
          </p>
        </div>
      </div>

      {/* Info cards row */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {infoItems.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center gap-2 text-primary">{item.icon}</div>
            <div className="mt-3 text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {item.value}
              {item.sub ? <span className="ml-1 text-xs font-normal text-muted-foreground">{item.sub}</span> : null}
            </div>
          </Card>
        ))}
      </div>

      {/* Main + sidebar */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Main column */}
        <div className="flex-1 space-y-6">
          {/* Product table + total panel */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <Card className="flex-1 overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <SectionTitle className="mb-0">产品与服务清单</SectionTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">序号</th>
                      <th className="px-4 py-3 font-medium">产品 / 服务名称</th>
                      <th className="px-4 py-3 font-medium">规格 / 描述</th>
                      <th className="px-4 py-3 font-medium">计量周期</th>
                      <th className="px-4 py-3 text-right font-medium">数量</th>
                      <th className="px-4 py-3 text-right font-medium">单价（元）</th>
                      <th className="px-4 py-3 text-right font-medium">金额（元）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.spec}</td>
                        <td className="px-4 py-3">{item.cycle}</td>
                        <td className="px-4 py-3 text-right">{item.qty}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCNY(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCNY(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                <AlertCircle size={14} className="text-info" />
                以上价格不含税，如需开具增值税专用发票另行计算。
              </div>
            </Card>

            {/* Total panel */}
            <Card className="h-fit w-full border-primary/30 bg-primary/[0.03] p-5 xl:w-[260px]">
              <h3 className="text-sm font-semibold text-foreground">报价总汇</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">报价总汇（税前）</dt>
                  <dd className="font-medium tabular-nums">{formatCNY(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">税费（13%）</dt>
                  <dd className="font-medium tabular-nums">{formatCNY(tax)}</dd>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                  <dt className="font-semibold">报价总价（含税）</dt>
                  <dd className="text-xl font-bold text-primary tabular-nums">{formatCNY(total)}</dd>
                </div>
              </dl>
              <div className="mt-4 rounded-control border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                大写金额：壹拾柒万零陆佰陆拾圆整
              </div>
            </Card>
          </div>

          {/* Terms */}
          <div>
            <SectionTitle>交易条款</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {terms.map((term) => (
                <Card key={term.title} className="p-5">
                  <div className="flex items-center gap-2 text-primary">{term.icon}</div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{term.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{term.body}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* 备注说明 */}
          <Card className="p-5">
            <SectionTitle>备注说明</SectionTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本报价基于您提供的需求而制定，最终方案以双方签订的正式合同为准。报价有效期为 14 天，逾期后价格与权益可能调整。
              如需对非标功能、私有化部署规模或 SLA 等级进行定制，请联系您的专属销售顾问获取补充报价。
            </p>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              leftIcon={<CheckCircle2 size={16} />}
              disabled={confirmed}
              onClick={() => setConfirmed(true)}
            >
              {confirmed ? "已确认报价" : "确认报价"}
            </Button>
            <Button variant="outline" leftIcon={<Pencil size={16} />}>
              申请修改
            </Button>
            <Button variant="outline" leftIcon={<MessageSquare size={16} />}>
              联系销售
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle size={14} className="text-warning" />
            点击“确认报价”即表示您已阅读并同意本报价与所有条款。
          </div>
        </div>

        {/* Right sidebar - 您的专属销售 */}
        <div className="w-full lg:w-[30%]">
          <Card className="p-5">
            <SectionTitle>您的专属销售</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                张
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">张伟</div>
                <div className="text-xs text-muted-foreground">客户成功顾问</div>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={14} className="text-primary" />
                <span className="text-foreground">138-8888-8888</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} className="text-primary" />
                <span className="text-foreground">zhangwei@qiyun.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare size={14} className="text-primary" />
                <span className="text-foreground">zhangwei@qiyunai.com</span>
              </div>
            </div>

            <Button variant="outline" className="mt-5 w-full border-primary/40 text-primary" leftIcon={<MessageSquare size={16} />}>
              联系销售
            </Button>
          </Card>

          <Card className="mt-4 p-5">
            <SectionTitle>相关附件</SectionTitle>
            <ul className="space-y-2">
              {attachments.map((file) => (
                <li key={file.name}>
                  <button className="flex w-full items-center justify-between gap-2 rounded-control border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-accent">
                    <span className="inline-flex items-center gap-2 truncate">
                      <FileText size={14} className="shrink-0 text-muted-foreground" />
                      {file.name}
                    </span>
                    <Download size={14} className="shrink-0 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </ConsolePage>
  );
}
