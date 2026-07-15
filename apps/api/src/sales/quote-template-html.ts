import type {
  QuotePreviewProduct,
  QuotePreviewSample,
  QuoteTemplateRecord,
} from "./sales.types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtYuan(value: number): string {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type ColumnDef = {
  header: string;
  align?: "right";
  render: (product: QuotePreviewProduct) => string;
};

const PER_ROW_COLUMNS: Record<string, ColumnDef> = {
  产品名称: { header: "产品名称", render: (p) => escapeHtml(p.name) },
  规格型号: { header: "规格型号", render: (p) => escapeHtml(p.model) },
  数量: { header: "数量", render: (p) => escapeHtml(`${p.qty} ${p.unit}`) },
  单价: { header: "单价(元)", align: "right", render: (p) => fmtYuan(p.price) },
  金额: { header: "金额(元)", align: "right", render: (p) => fmtYuan(p.amount) },
  交付周期: { header: "交付周期", render: (p) => escapeHtml(p.deliveryCycle ?? "—") },
  折扣: {
    header: "折扣(%)",
    align: "right",
    render: (p) => (p.discount != null ? String(p.discount) : "0"),
  },
  税率: { header: "税率", align: "right", render: () => "13%" },
  备注: { header: "备注", render: () => "—" },
};

export function renderQuoteTemplateHtml(
  template: QuoteTemplateRecord,
  sample: QuotePreviewSample,
): string {
  const color = template.themeColor || "#1677ff";
  const columns = template.fields
    .map((field) => PER_ROW_COLUMNS[field])
    .filter((column): column is ColumnDef => Boolean(column));
  const subtotal = sample.products.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;
  const showSubtotal = template.fields.includes("小计");
  const titleAlign =
    template.logoPosition === "center" || template.logoPosition === "right"
      ? "text-align:center;margin-top:8px;"
      : "";

  const headerFlex =
    template.logoPosition === "center"
      ? "justify-content:center;text-align:center;"
      : template.logoPosition === "right"
        ? "justify-content:flex-end;"
        : "justify-content:flex-start;";

  const tableHead = columns
    .map(
      (column) =>
        `<th style="border:1px solid #cbd5e1;padding:8px;text-align:${column.align === "right" ? "right" : "left"};background:${color}14;">${escapeHtml(column.header)}</th>`,
    )
    .join("");

  const tableRows = sample.products
    .map((product, index) => {
      const cells = columns
        .map(
          (column) =>
            `<td style="border:1px solid #cbd5e1;padding:8px;text-align:${column.align === "right" ? "right" : "left"};">${column.render(product)}</td>`,
        )
        .join("");
      return `<tr><td style="border:1px solid #cbd5e1;padding:8px;">${index + 1}</td>${cells}</tr>`;
    })
    .join("");

  const summaryRows = [
    showSubtotal
      ? `<tr><td style="border:1px solid #cbd5e1;padding:8px;font-weight:600;" colspan="${columns.length + 1}">小计(元)</td><td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${fmtYuan(subtotal)}</td></tr>`
      : "",
    `<tr><td style="border:1px solid #cbd5e1;padding:8px;" colspan="${columns.length + 1}">增值税(13%)</td><td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${fmtYuan(tax)}</td></tr>`,
    `<tr><td style="border:1px solid #cbd5e1;padding:8px;font-weight:700;color:${color};" colspan="${columns.length + 1}">合计(元)</td><td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:700;color:${color};">${fmtYuan(total)}</td></tr>`,
  ].join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(template.templateName)}</title>
  <style>
    body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #1e293b; margin: 0; background: #f8fafc; }
    .sheet { max-width: 794px; margin: 24px auto; background: #fff; padding: 48px 56px; box-shadow: 0 12px 40px rgba(15,23,42,.12); }
    @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; } }
  </style>
</head>
<body>
  <article class="sheet">
    <header style="display:flex;align-items:flex-start;gap:16px;border-bottom:2px solid ${color};padding-bottom:16px;${headerFlex}">
      <div style="display:flex;align-items:center;gap:12px;${template.logoPosition === "center" ? "flex-direction:column;" : ""}">
        <div style="width:48px;height:48px;border-radius:8px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${escapeHtml(sample.company.name.slice(0, 1))}</div>
        <div>
          <div style="font-size:18px;font-weight:700;color:${color};">${escapeHtml(sample.company.name)}</div>
          <div style="font-size:11px;color:#94a3b8;">${escapeHtml(sample.company.enName)}</div>
        </div>
      </div>
      ${template.logoPosition === "left" ? `<h1 style="margin-left:auto;font-size:24px;letter-spacing:.3em;">报价单</h1>` : ""}
    </header>
    ${template.logoPosition !== "left" ? `<h1 style="font-size:24px;letter-spacing:.3em;${titleAlign}">报价单</h1>` : ""}

    <section style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:20px;font-size:13px;">
      <div><span style="color:#64748b;">报价单号：</span><strong>${escapeHtml(sample.quoteNo)}</strong></div>
      <div><span style="color:#64748b;">报价日期：</span>${escapeHtml(sample.date)}</div>
      <div><span style="color:#64748b;">有效期至：</span>${escapeHtml(sample.validUntil)}</div>
      <div><span style="color:#64748b;">币种：</span>${escapeHtml(sample.currency)}</div>
    </section>

    ${
      template.showCompanyInfo
        ? `<section style="margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;">
      <div style="font-weight:600;margin-bottom:8px;">我方信息</div>
      <div>公司名称：${escapeHtml(sample.company.name)}</div>
      <div>联系电话：${escapeHtml(sample.company.phone)}</div>
      <div>地址：${escapeHtml(sample.company.address)}</div>
    </section>`
        : ""
    }

    ${
      template.showCustomerInfo
        ? `<section style="margin-top:12px;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;">
      <div style="font-weight:600;margin-bottom:8px;">客户信息</div>
      <div>客户名称：${escapeHtml(sample.customer.name)}</div>
      <div>联系人：${escapeHtml(sample.customer.contact)}</div>
      <div>电话：${escapeHtml(sample.customer.phone)}</div>
      <div>邮箱：${escapeHtml(sample.customer.email)}</div>
    </section>`
        : ""
    }

    <p style="margin-top:16px;font-size:13px;color:#475569;">尊敬的${escapeHtml(sample.customer.contact)}：以下是针对您需求整理的报价方案，敬请审阅。</p>

    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;">
      <thead><tr><th style="border:1px solid #cbd5e1;padding:8px;background:${color}14;">#</th>${tableHead}</tr></thead>
      <tbody>${tableRows}${summaryRows}</tbody>
    </table>

    <section style="margin-top:20px;font-size:12px;color:#475569;">
      <div style="font-weight:600;color:#334155;margin-bottom:8px;">报价条款与条件</div>
      <ul style="margin:0;padding-left:20px;">
        <li>${escapeHtml(template.terms.validity)}</li>
        <li>${escapeHtml(template.terms.payment)}</li>
        <li>${escapeHtml(template.terms.delivery)}</li>
      </ul>
    </section>

    ${sample.remark ? `<p style="margin-top:12px;font-size:12px;color:#64748b;">备注：${escapeHtml(sample.remark)}</p>` : ""}
  </article>
</body>
</html>`;
}
