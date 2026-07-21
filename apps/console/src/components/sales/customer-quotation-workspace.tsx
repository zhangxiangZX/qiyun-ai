"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Alert, Badge, Button, Skeleton } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getQuoteDocument } from "@/lib/quotes/api";
import type { QuoteDocumentPayload } from "@/lib/quotes/api";

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

const formatCNY = (v: number) =>
  `¥${v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-card border border-border bg-card shadow-card ${className ?? ""}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-4 text-base font-semibold text-foreground ${className ?? ""}`}>{children}</h2>;
}

export function CustomerQuotationWorkspace({ quoteId }: { quoteId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [document, setDocument] = useState<QuoteDocumentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : false;
      setIsPreview(preview);
      if (preview) {
        setDocument(null);
        setError("演示模式下无法加载真实客户报价文档。请配置上游 API 后查看。");
        return;
      }
      setDocument(await getQuoteDocument(quoteId));
    } catch (loadError) {
      setDocument(null);
      setError(getApiErrorMessage(loadError, "报价单加载失败。"));
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const infoItems: InfoItem[] = useMemo(() => {
    if (!document) return [];
    return [
      { icon: <FileText size={18} />, label: "报价单号", value: document.sample.quoteNo },
      { icon: <Sparkles size={18} />, label: "报价日期", value: document.sample.date },
      { icon: <Phone size={18} />, label: "有效期至", value: document.sample.validUntil },
      { icon: <CreditCard size={18} />, label: "币种", value: document.sample.currency },
      {
        icon: <ShieldCheck size={18} />,
        label: "报价状态",
        value: confirmed ? "已确认（本地）" : "待确认",
      },
    ];
  }, [confirmed, document]);

  const lineItems: LineItem[] = useMemo(() => {
    if (!document) return [];
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
    if (!document) return [];
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

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * 0.13);
  const total = subtotal + tax;
  const companyName = document?.sample.company.name ?? "—";
  const customerName = document?.sample.customer.contact ?? "";
  const salesName = document?.sample.company.name ? "销售顾问" : "—";

  if (loading) {
    return (
      <ConsolePage>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-96 w-full" />
      </ConsolePage>
    );
  }

  if (error || !document) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="客户专属报价" />
        </ConsolePageAlerts>
        <ConsoleRequestError
          message={error ?? "报价不存在。"}
          onRetry={() => void load()}
        />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="客户专属报价" />
        {isPreview ? (
          <Alert variant="warning" title="演示模式">
            当前为演示数据通道，客户确认不会写入后端。
          </Alert>
        ) : null}
        {confirmNotice ? (
          <Alert variant="info" title="操作说明">
            {confirmNotice}
          </Alert>
        ) : null}
      </ConsolePageAlerts>

      <div className="flex flex-col gap-3 rounded-card border border-border bg-gradient-to-r from-primary/10 via-primary/[0.04] to-transparent px-4 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles size={18} className="text-primary" />
          {companyName}
        </div>
        <div className="text-sm text-muted-foreground">客户专属报价视图</div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              您的专属报价
            </h1>
            <Badge variant="default">正式报价</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            您好{customerName ? `，${customerName}` : ""}
            ，感谢关注。以下方案来自报价文档接口，金额与条款以正式合同为准。
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {infoItems.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center gap-2 text-primary">{item.icon}</div>
            <div className="mt-3 text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {item.value}
              {item.sub ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">{item.sub}</span>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-col gap-6 xl:flex-row">
            <Card className="min-w-0 flex-1 overflow-hidden">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <SectionTitle className="mb-0">产品与服务清单</SectionTitle>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] caption-bottom text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">序号</th>
                      <th className="px-4 py-3 font-medium">产品 / 服务名称</th>
                      <th className="px-4 py-3 font-medium">规格 / 描述</th>
                      <th className="px-4 py-3 font-medium">计量</th>
                      <th className="px-4 py-3 text-right font-medium">数量</th>
                      <th className="px-4 py-3 text-right font-medium">单价</th>
                      <th className="px-4 py-3 text-right font-medium">金额</th>
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
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCNY(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatCNY(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {lineItems.map((item, idx) => (
                  <li key={item.id} className="space-y-1 px-4 py-3 text-sm">
                    <div className="font-medium text-foreground">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.spec}</div>
                    <div className="flex justify-between text-xs">
                      <span>
                        {item.qty} × {formatCNY(item.unitPrice)}
                      </span>
                      <span className="font-medium">{formatCNY(item.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="h-fit w-full border-primary/30 bg-primary/[0.03] p-5 xl:w-[260px]">
              <h3 className="text-sm font-semibold text-foreground">报价总汇</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">税前合计</dt>
                  <dd className="font-medium tabular-nums">{formatCNY(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">税费（13%）</dt>
                  <dd className="font-medium tabular-nums">{formatCNY(tax)}</dd>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                  <dt className="font-semibold">含税总价</dt>
                  <dd className="text-xl font-bold text-primary tabular-nums">{formatCNY(total)}</dd>
                </div>
              </dl>
            </Card>
          </div>

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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              leftIcon={<CheckCircle2 size={16} />}
              disabled={confirmed}
              onClick={() => {
                setConfirmed(true);
                setConfirmNotice(
                  "客户确认接口尚未接通：此操作仅保存在本页本地状态，不会写入后端。详见 BACKEND-GAPS。",
                );
              }}
            >
              {confirmed ? "已确认（本地）" : "确认报价"}
            </Button>
            <Button
              variant="outline"
              leftIcon={<Pencil size={16} />}
              disabled
              title="申请修改接口尚未开放"
            >
              申请修改
            </Button>
            <Button
              variant="outline"
              leftIcon={<MessageSquare size={16} />}
              disabled
              title="联系销售通道尚未开放"
            >
              联系销售
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle size={14} className="text-warning" />
            「确认报价」在后端确认接口就绪前不会产生真实业务状态变更。
          </div>
        </div>

        <div className="w-full lg:w-[30%]">
          <Card className="p-5">
            <SectionTitle>您的专属销售</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                销
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">{salesName}</div>
                <div className="text-xs text-muted-foreground">由报价所属企业对接</div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                <span>联系方式请向销售顾问索取</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary" />
                <span>暂无公开邮箱字段</span>
              </div>
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <SectionTitle>相关附件</SectionTitle>
            <Alert variant="info" title="附件未接通">
              暂无报价附件列表接口，不会展示可下载的示例文件。
            </Alert>
          </Card>
        </div>
      </div>
    </ConsolePage>
  );
}
