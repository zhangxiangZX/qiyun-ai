"use client";

import { forwardRef } from "react";
import {
  DEFAULT_PREVIEW_SAMPLE,
  type QuotePreviewProduct,
  type QuotePreviewSample,
  type QuoteTemplateConfig,
} from "@/lib/quotes/template-types";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .quote-sheet-print, .quote-sheet-print * { visibility: visible !important; }
  .quote-sheet-print {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 794px !important;
    margin: 0 !important;
    box-shadow: none !important;
    transform: none !important;
  }
}
`;

function fmtYuan(n: number): string {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ColumnDef {
  header: string;
  align?: "right";
  render: (p: QuotePreviewProduct) => React.ReactNode;
}

const PER_ROW_COLUMNS: Record<string, ColumnDef> = {
  产品名称: { header: "产品名称", render: (p) => p.name },
  规格型号: { header: "规格型号", render: (p) => p.model },
  数量: { header: "数量", render: (p) => `${p.qty} ${p.unit}` },
  单价: { header: "单价(元)", align: "right", render: (p) => fmtYuan(p.price) },
  金额: { header: "金额(元)", align: "right", render: (p) => fmtYuan(p.amount) },
  交付周期: { header: "交付周期", render: (p) => p.deliveryCycle ?? "—" },
  折扣: { header: "折扣(%)", align: "right", render: (p) => (p.discount != null ? String(p.discount) : "0") },
  税率: { header: "税率", align: "right", render: () => "13%" },
  备注: { header: "备注", render: () => "—" },
};

export interface QuoteHtmlPreviewProps {
  config: QuoteTemplateConfig;
  sample?: QuotePreviewSample;
  className?: string;
}

/**
 * 报价单 HTML 预览（三层架构中间层）。
 * 输入：模板 JSON 配置 + 示例数据 → 输出：可打印的 HTML 报价单。
 */
export const QuoteHtmlPreview = forwardRef<HTMLDivElement, QuoteHtmlPreviewProps>(function QuoteHtmlPreview(
  { config, sample = DEFAULT_PREVIEW_SAMPLE, className },
  ref,
) {
  const color = config.themeColor || "#1677ff";
  const columns = config.fields
    .map((f) => PER_ROW_COLUMNS[f])
    .filter((c): c is ColumnDef => Boolean(c));

  const subtotal = sample.products.reduce((s, p) => s + p.amount, 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;
  const showSubtotal = config.fields.includes("小计");

  const logoJustify =
    config.logoPosition === "center"
      ? "justify-center"
      : config.logoPosition === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div
        ref={ref}
        className={`quote-sheet-print mx-auto bg-white text-[13px] leading-relaxed text-slate-800 shadow-2xl ${className ?? ""}`}
        style={{ width: 794, maxWidth: "100%", padding: "48px 56px" }}
      >
        {/* 信头 */}
        <div
          className={`flex items-start gap-4 border-b-2 pb-4 ${logoJustify}`}
          style={config.logoPosition === "center" || config.logoPosition === "right" ? { flexDirection: "row" } : undefined}
        >
          <div className={`flex items-center gap-3 ${config.logoPosition === "center" ? "flex-col text-center" : ""}`}>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
              style={{ background: color }}
            >
              <span className="text-base font-bold">{sample.company.name.slice(0, 1)}</span>
            </div>
            <div className={config.logoPosition === "center" ? "text-center" : ""}>
              <p className="text-lg font-bold" style={{ color }}>
                {sample.company.name}
              </p>
              <p className="text-[11px] tracking-wide text-slate-400">{sample.company.enName}</p>
            </div>
          </div>
          {config.logoPosition === "left" ? (
            <h2 className="ml-auto text-2xl font-bold tracking-[0.3em] text-slate-800">报价单</h2>
          ) : null}
        </div>
        {config.logoPosition !== "left" ? (
          <h2 className="mt-2 text-center text-2xl font-bold tracking-[0.3em] text-slate-800">报价单</h2>
        ) : null}

        {/* 基本信息 */}
        <div className="mt-5 grid grid-cols-2 gap-y-2 text-[13px]">
          <div>
            <span className="text-slate-500">报价单号：</span>
            <span className="font-medium">{sample.quoteNo}</span>
          </div>
          <div>
            <span className="text-slate-500">报价日期：</span>
            <span>{sample.date}</span>
          </div>
          <div>
            <span className="text-slate-500">有效期至：</span>
            <span>{sample.validUntil}</span>
          </div>
          <div>
            <span className="text-slate-500">币种：</span>
            <span>{sample.currency}</span>
          </div>
        </div>

        {/* 公司信息 */}
        {config.showCompanyInfo ? (
          <div className="mt-4 rounded border border-slate-200 p-3">
            <p className="mb-1.5 text-[12px] font-semibold text-slate-700">我方信息</p>
            <div className="grid grid-cols-2 gap-y-1 text-[13px]">
              <div>
                <span className="text-slate-500">公司名称：</span>
                <span>{sample.company.name}</span>
              </div>
              <div>
                <span className="text-slate-500">联系电话：</span>
                <span>{sample.company.phone}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">地址：</span>
                <span>{sample.company.address}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* 客户信息 */}
        {config.showCustomerInfo ? (
          <div className="mt-3 rounded border border-slate-200 p-3">
            <p className="mb-1.5 text-[12px] font-semibold text-slate-700">客户信息</p>
            <div className="grid grid-cols-2 gap-y-1 text-[13px]">
              <div>
                <span className="text-slate-500">客户名称：</span>
                <span>{sample.customer.name}</span>
              </div>
              <div>
                <span className="text-slate-500">联系人：</span>
                <span>{sample.customer.contact}</span>
              </div>
              <div>
                <span className="text-slate-500">电话：</span>
                <span>{sample.customer.phone}</span>
              </div>
              <div>
                <span className="text-slate-500">邮箱：</span>
                <span>{sample.customer.email}</span>
              </div>
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-[13px] text-slate-600">
          尊敬的{sample.customer.contact}：以下是针对您提供的产品报价方案，敬请审阅。如无异议，我们将尽快为您安排交付与实施。
        </p>

        {/* 产品明细表 */}
        <table className="mt-4 w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-left text-slate-700" style={{ background: `${color}14` }}>
              <th className="border border-slate-300 px-2 py-2">#</th>
              {columns.map((c) => (
                <th key={c.header} className={`border border-slate-300 px-2 py-2 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.products.map((p, i) => (
              <tr key={i}>
                <td className="border border-slate-300 px-2 py-2">{i + 1}</td>
                {columns.map((c) => (
                  <td
                    key={c.header}
                    className={`border border-slate-300 px-2 py-2 ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.render(p)}
                  </td>
                ))}
              </tr>
            ))}
            {showSubtotal ? (
              <tr className="font-medium">
                <td className="border border-slate-300 px-2 py-2" colSpan={columns.length + 1}>
                  小计(元)
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right">{fmtYuan(subtotal)}</td>
              </tr>
            ) : null}
            <tr>
              <td className="border border-slate-300 px-2 py-2" colSpan={columns.length + 1}>
                增值税(13%)
              </td>
              <td className="border border-slate-300 px-2 py-2 text-right">{fmtYuan(tax)}</td>
            </tr>
            <tr className="font-bold" style={{ color }}>
              <td className="border border-slate-300 px-2 py-2" colSpan={columns.length + 1}>
                合计(元)
              </td>
              <td className="border border-slate-300 px-2 py-2 text-right">{fmtYuan(total)}</td>
            </tr>
          </tbody>
        </table>

        {/* 条款 */}
        <div className="mt-5">
          <p className="mb-1.5 text-[12px] font-semibold text-slate-700">报价条款与条件</p>
          <ul className="list-disc space-y-1 pl-5 text-[12px] text-slate-600">
            <li>{config.terms.validity}</li>
            <li>{config.terms.payment}</li>
            <li>{config.terms.delivery}</li>
          </ul>
        </div>

        {sample.remark ? (
          <p className="mt-3 text-[12px] text-slate-500">备注：{sample.remark}</p>
        ) : null}

        {/* 页脚 */}
        <div className="mt-8 flex items-end justify-between">
          <div className="space-y-6 text-[12px] text-slate-600">
            <div>
              <p>客户确认（签章）：________________</p>
              <p className="mt-4">日期：____ 年 ____ 月 ____ 日</p>
            </div>
            <div>
              <p>核准签字：________________</p>
              <p className="mt-4">日期：{sample.date}</p>
            </div>
          </div>
          <div
            className="relative flex h-28 w-28 items-center justify-center"
            style={{ border: `4px solid ${color}80`, borderRadius: "9999px" }}
          >
            <div
              className="absolute inset-2 rounded-full border"
              style={{ borderColor: `${color}60` }}
            />
            <div className="px-2 text-center text-[11px] font-bold leading-tight" style={{ color: `${color}cc` }}>
              {sample.company.name}
              <br />
              报价专用章
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
