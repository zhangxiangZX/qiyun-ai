"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Download,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
  User,
} from "lucide-react";
import { Badge, Button, PageHeader } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";

/* ----------------------------------------------------------------------------
 * Types & mock data
 * ------------------------------------------------------------------------- */

interface ProductLine {
  id: string;
  name: string;
  model: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  status: "done" | "current" | "pending";
  sub?: string;
}

interface TermItem {
  label: string;
  value: string;
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

/* ----------------------------------------------------------------------------
 * Section card helper
 * ------------------------------------------------------------------------- */

function SectionCard({
  title,
  children,
  highlight,
  action,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-card border bg-card p-5 shadow-card ${
        highlight ? "border-primary/40 bg-primary/[0.03]" : "border-border"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Workspace
 * ------------------------------------------------------------------------- */

export function QuotationDetailWorkspace() {
  const [data] = useState(() => ({
    products: [
      { id: "1", name: "全身电镀装机", model: "PF-2064", spec: "电镀槽体 + 自动输送系统，含电气控制柜", qty: 1, unit: "套", unitPrice: 58000 },
      { id: "2", name: "嵌入式工控系统", model: "CV-1560", spec: "嵌入式控制器 + 10寸工业触摸屏", qty: 2, unit: "套", unitPrice: 12000 },
      { id: "3", name: "精密轴输送线", model: "PC-57", spec: "PLC 控制系统 + 伺服驱动，含编码器", qty: 1, unit: "套", unitPrice: 18000 },
      { id: "4", name: "安装调试服务", model: "INSTALL", spec: "现场安装、接线、单机与联动调试", qty: 1, unit: "项", unitPrice: 8000 },
      { id: "5", name: "备品备件包", model: "SPARE-KIT", spec: "易损件一套（密封圈 / 滤芯 / 保险）", qty: 1, unit: "套", unitPrice: 2000 },
    ] as ProductLine[],
    summary: { subtotal: 110000, tax: 14300, freight: 4300, other: 0, total: 128600 },
    timeline: [
      { id: "t1", title: "报价已发送客户", time: "今天 10:23", status: "current" as const },
      { id: "t2", title: "创建已完成", time: "今天 10:20", status: "done" as const },
      { id: "t3", title: "新客户跟进", time: "今天 10:20", status: "done" as const },
      { id: "t4", title: "内容评审通过", time: "昨天 16:45", status: "done" as const },
      { id: "t5", title: "关联创建（Google Ads）", time: "昨天 16:42", status: "done" as const },
    ] as TimelineEvent[],
    deliveryTerms: [
      { label: "交付周期", value: "合同签订并收到预付款后 30 个工作日内发货" },
      { label: "售后服务", value: "整机质保 12 个月，终身提供技术咨询与维修" },
      { label: "技术支持", value: "提供远程调试与现场培训，7×12 小时响应" },
      { label: "确认条件", value: "客户盖章回传或邮件确认即视为生效" },
      { label: "备件供应", value: "质保期后仍按需供应原厂备件，价格另议" },
    ] as TermItem[],
    businessTerms: [
      { label: "付款方式", value: "预付款 30% + 发货款 60% + 质保金 10%" },
      { label: "报价条款", value: "本报价含 13% 增值税专用票" },
      { label: "交接方式", value: "厂内验收 / 客户现场交货二选一" },
      { label: "交货周期", value: "收到预付款后 30 个工作日" },
      { label: "质保期", value: "自验收合格之日起 12 个月" },
      { label: "报价有效期", value: "自发出之日起 30 天（剩余 29 天）" },
      { label: "备注", value: "含基础安装调试，特殊工况另行报价" },
    ] as TermItem[],
  }));

  const { products, summary, timeline, deliveryTerms, businessTerms } = data;

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="报价详情" />
      </ConsolePageAlerts>

      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={12} /> 询盘与报价 / 报价管理 / 报价详情
          </Link>
        }
        title="报价单号 Q-20240601-0008"
        description="浙江坚诚机械有限公司 · 关联询盘 IQ-20240531-0126"
        actions={
          <>
            <Badge variant="success">已发送</Badge>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              创建于 2024-06-01 · 有效期剩余 29 天
            </span>
            <Button variant="outline" asChild>
              <Link href="/dashboard/quotes/q1/edit">
                <Pencil size={16} className="mr-1.5" />
                编辑报价
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/quotes/q1/preview">
                <Download size={16} className="mr-1.5" />
                导出 PDF
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/quotes/q1/customer">
                <Send size={16} className="mr-1.5" />
                发送给客户
              </Link>
            </Button>
          </>
        }
      />

      {/* Row 1: 客户信息 / 关联询盘 / 报价金额汇总 */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-[34%]">
          <SectionCard title="客户信息">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold text-foreground">浙江坚诚机械有限公司</span>
              <Link href="#" className="text-xs text-primary hover:underline">
                查看客户
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="公司联系人" value={<span className="inline-flex items-center gap-1"><User size={12} className="text-muted-foreground" />李娜</span>} />
              <Field label="联系电话" value={<span className="inline-flex items-center gap-1"><Phone size={12} className="text-muted-foreground" />138-0571-8826</span>} />
              <Field label="邮箱" value={<span className="inline-flex items-center gap-1"><Mail size={12} className="text-muted-foreground" />lina@jiancheng-jx.com</span>} full />
              <Field
                label="公司地址"
                value={
                  <span className="inline-flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 text-muted-foreground" />
                    浙江省杭州市萧山区经济技术开发区启迪路 88 号
                  </span>
                }
                full
              />
              <Field label="客户等级" value={<Badge variant="warning">A 类重点客户</Badge>} />
              <Field label="备注" value="预算充足，关注交期与售后" full />
            </div>
          </SectionCard>
        </div>

        <div className="flex-1">
          <SectionCard title="关联询盘">
            <div className="grid grid-cols-2 gap-4">
              <Field label="询盘单号" value={<span className="text-primary">IQ-20240531-0126</span>} />
              <Field label="渠道来源" value={<Badge variant="info">Google Ads</Badge>} />
              <Field label="商品来源" value="官网产品页" />
              <Field label="商品全称" value="全自动电镀生产线" />
              <Field label="报价日期" value="2024-06-01" />
              <Field label="商品金额" value={<span className="font-semibold text-foreground">约 ¥130,000</span>} />
              <Field
                label="商品详情"
                value={
                  <Link href="#" className="text-xs text-primary hover:underline">
                    查看商品详情
                  </Link>
                }
                full
              />
            </div>
          </SectionCard>
        </div>

        <div className="w-full lg:w-[30%]">
          <SectionCard title="报价金额汇总" highlight>
            <div className="text-right text-3xl font-bold tracking-tight text-primary">
              {formatCurrency(summary.total)}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">产品小计</dt>
                <dd className="font-medium">{formatCurrency(summary.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">税费（13%）</dt>
                <dd className="font-medium">{formatCurrency(summary.tax)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">运费</dt>
                <dd className="font-medium">{formatCurrency(summary.freight)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">其他费用</dt>
                <dd className="font-medium">{formatCurrency(summary.other)}</dd>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <dt className="font-semibold">总计（含税）</dt>
                <dd className="text-xl font-bold text-primary">{formatCurrency(summary.total)}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>

      {/* 产品明细 table */}
      <div className="mt-6 rounded-card border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">产品明细（{products.length} 项）</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">产品名称 / 型号</th>
                <th className="px-4 py-3 font-medium">规格描述</th>
                <th className="px-4 py-3 text-right font-medium">数量</th>
                <th className="px-4 py-3 font-medium">单位</th>
                <th className="px-4 py-3 text-right font-medium">单价（元）</th>
                <th className="px-4 py-3 text-right font-medium">小计（元）</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => (
                <tr key={item.id} className="border-b border-border/60 hover:bg-accent/40">
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.model}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.spec}</td>
                  <td className="px-4 py-3 text-right">{item.qty}</td>
                  <td className="px-4 py-3">{item.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.unitPrice.toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {(item.unitPrice * item.qty).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row split: 交付与售后 / 商务条款 / 跟进时间线 */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 lg:w-[55%]">
          <SectionCard title="交付与售后说明">
            <ul className="space-y-3">
              {deliveryTerms.map((term) => (
                <li key={term.label} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{term.label}</div>
                    <div className="text-sm text-muted-foreground">{term.value}</div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="w-full lg:w-[25%]">
          <SectionCard title="商务条款">
            <dl className="space-y-3">
              {businessTerms.map((term) => (
                <div key={term.label} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <dt className="shrink-0 text-xs text-muted-foreground">{term.label}</dt>
                  <dd className="text-right text-sm text-foreground">{term.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </div>

        <div className="w-full lg:w-[20%]">
          <SectionCard title="跟进时间线">
            <ol className="relative space-y-4 pl-5">
              <span className="absolute left-[6px] top-1 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden />
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    className={`absolute -left-5 top-1 flex h-3 w-3 items-center justify-center rounded-full ${
                      event.status === "done"
                        ? "bg-success"
                        : event.status === "current"
                          ? "bg-primary ring-4 ring-primary/15"
                          : "bg-muted-foreground/40"
                    }`}
                  >
                    {event.status === "done" ? (
                      <Check size={8} className="text-white" />
                    ) : (
                      <Circle size={6} className="text-white" fill="currentColor" />
                    )}
                  </span>
                  <div className="text-sm font-medium text-foreground">{event.title}</div>
                  <div className="text-xs text-muted-foreground">{event.time}</div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      {/* 客户反馈 / 下一步操作 */}
      <div className="mt-6 rounded-card border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="warning">
                <AlertCircle size={12} className="mr-1" /> 客户新反馈
              </Badge>
              <span className="text-sm text-muted-foreground">
                客户希望确认电镀槽材质与交期，建议 2 个工作日内电话沟通。
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span>
                <span className="text-muted-foreground">下一步行动：</span>
                <span className="font-medium text-foreground">电话沟通项目细节</span>
              </span>
              <span>
                <span className="text-muted-foreground">负责人：</span>
                <span className="font-medium text-foreground">张先生</span>
              </span>
              <span>
                <span className="text-muted-foreground">计划跟进时间：</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Clock size={12} /> 2024-06-03 10:00
                </span>
              </span>
            </div>
          </div>
          <Button variant="default" leftIcon={<ChevronRight size={16} />}>
            标记为已推进
          </Button>
        </div>
      </div>
    </ConsolePage>
  );
}
