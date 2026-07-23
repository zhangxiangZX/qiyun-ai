import { randomUUID } from "node:crypto";

import type {
  InquiryRecord,
  QuoteOpportunityRecord,
  QuotePreviewProduct,
  QuotePreviewSample,
  QuoteTemplateRecord,
} from "./sales.types";

const DEFAULT_FIELDS = ["产品名称", "规格型号", "数量", "单价", "金额", "交付周期"];

export const DEFAULT_QUOTE_PREVIEW_SAMPLE: QuotePreviewSample = {
  quoteNo: "QT-20260601-0042",
  date: "2026-06-01",
  validUntil: "2026-06-30",
  currency: "人民币（CNY）",
  company: {
    name: "企云科技",
    enName: "Qiyun Technology",
    address: "沈阳市浑南区智慧产业园 A 座 12 层",
    phone: "024-8888 6666",
  },
  customer: {
    name: "华东精密制造有限公司",
    contact: "王经理",
    phone: "139 0123 4567",
    email: "wang@huadong-mfg.com",
  },
  products: [
    {
      name: "工业级边缘计算网关",
      model: "GY-ECG-8000",
      qty: 12,
      unit: "台",
      price: 6800,
      amount: 81600,
      deliveryCycle: "15 个工作日",
    },
    {
      name: "光纤终端模块",
      model: "SFP-TG-SR",
      qty: 40,
      unit: "个",
      price: 1200,
      amount: 48000,
      deliveryCycle: "7 个工作日",
      discount: 5,
    },
  ],
  remark: "以上报价含 13% 增值税专用发票，不含现场差旅费用。",
};

export function defaultQuoteTemplateTerms() {
  return {
    payment: "合同签订后支付 30% 预付款，发货前支付 70%。",
    delivery: "合同生效后 30 个工作日内交付。",
    validity: "本报价有效期 30 天。",
  };
}

export function buildDefaultQuoteTemplateRecord(
  workspaceId: string,
  partial?: Partial<Pick<QuoteTemplateRecord, "templateName" | "companyName" | "description">>,
): QuoteTemplateRecord {
  const now = new Date().toISOString();
  return {
    id: `qtpl_${randomUUID()}`,
    workspaceId,
    templateName: partial?.templateName?.trim() || "标准设备报价模板",
    companyName: partial?.companyName?.trim() || "企云科技",
    description: partial?.description?.trim() || "面向标准工业设备的蓝色商务风格报价单。",
    themeColor: "#1677ff",
    logoPosition: "left",
    showCompanyInfo: true,
    showCustomerInfo: true,
    fields: [...DEFAULT_FIELDS],
    terms: defaultQuoteTemplateTerms(),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildQuotePreviewSampleFromOpportunity(
  quote: QuoteOpportunityRecord,
  inquiry: InquiryRecord | null,
  template: QuoteTemplateRecord,
  options?: { logoUrl?: string },
): QuotePreviewSample {
  const date = formatDateOnly(quote.createdAt);
  const validUntil = formatDateOnly(quote.quoteDueAt) || addDaysIso(date, 30);
  const amount = quote.quotedAmount ?? quote.estimatedAmount ?? 0;
  const customerName = inquiry?.customerName?.trim() || "客户";
  const contact = inquiry?.customerContact?.trim() || customerName;
  const details = quote.details ?? {};
  const lineItems = details.lineItems ?? [];
  const defaultDelivery = template.terms.delivery.includes("工作日")
    ? template.terms.delivery
    : "按合同约定";
  const products: QuotePreviewProduct[] =
    lineItems.length > 0
      ? lineItems.map((item) => {
          const qty = item.qty || 0;
          const price = item.price || 0;
          const discount = item.discount ?? 0;
          return {
            name: item.name,
            model: item.model || "—",
            qty,
            unit: item.unit || "项",
            price,
            amount: qty * price * (1 - discount / 100),
            deliveryCycle: item.deliveryCycle || defaultDelivery,
            discount: discount || undefined,
          };
        })
      : amount > 0
        ? [
            {
              name: quote.title ?? inquiry?.summary?.slice(0, 48) ?? "报价项目",
              model: inquiry?.summary?.slice(0, 32) || "—",
              qty: 1,
              unit: "项",
              price: amount,
              amount,
              deliveryCycle: defaultDelivery,
            },
          ]
        : DEFAULT_QUOTE_PREVIEW_SAMPLE.products;

  const remarkParts: string[] = [];
  if (details.remark?.trim()) {
    remarkParts.push(details.remark.trim());
  }
  if (inquiry?.summary) {
    remarkParts.push(`需求摘要：${inquiry.summary}`);
  }
  if (details.freight || details.install || details.other || details.taxRate != null) {
    remarkParts.push(
      [
        details.freight ? `运费 ${details.freight}` : null,
        details.install ? `安装 ${details.install}` : null,
        details.other ? `其他 ${details.other}` : null,
        details.taxRate != null ? `税率 ${(details.taxRate * 100).toFixed(0)}%` : null,
      ]
        .filter(Boolean)
        .join("；"),
    );
  }

  return {
    quoteNo: quote.id.replace(/^qopp_/, "QT-").slice(0, 20).toUpperCase(),
    date,
    validUntil,
    currency: "人民币（CNY）",
    company: {
      name: template.companyName || DEFAULT_QUOTE_PREVIEW_SAMPLE.company.name,
      enName: DEFAULT_QUOTE_PREVIEW_SAMPLE.company.enName,
      address: DEFAULT_QUOTE_PREVIEW_SAMPLE.company.address,
      phone: DEFAULT_QUOTE_PREVIEW_SAMPLE.company.phone,
      logoUrl: options?.logoUrl,
    },
    customer: {
      name: customerName,
      contact,
      phone: contact.includes("@") ? "—" : contact,
      email: contact.includes("@") ? contact : "—",
    },
    products,
    remark: remarkParts.length > 0 ? remarkParts.join("\n") : DEFAULT_QUOTE_PREVIEW_SAMPLE.remark,
  };
}

export function mapQuoteTemplateResponse(record: QuoteTemplateRecord) {
  return {
    id: record.id,
    templateName: record.templateName,
    companyName: record.companyName,
    description: record.description,
    themeColor: record.themeColor,
    logoPosition: record.logoPosition,
    showCompanyInfo: record.showCompanyInfo,
    showCustomerInfo: record.showCustomerInfo,
    fields: record.fields,
    terms: record.terms,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
