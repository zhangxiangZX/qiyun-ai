// 报价模板类型定义
// 三层架构：JSON 配置(本文件) → HTML+CSS 预览(quote-html-preview) → PDF 交付(window.print)

export type TemplateLogoPosition = "left" | "center" | "right";

export interface QuoteTemplateTerms {
  payment: string;
  delivery: string;
  validity: string;
}

/** 系统保存的模板 JSON 结构 */
export interface QuoteTemplateConfig {
  templateName: string;
  themeColor: string;
  logoPosition: TemplateLogoPosition;
  showCompanyInfo: boolean;
  showCustomerInfo: boolean;
  /** 明细表列（顺序即展示顺序） */
  fields: string[];
  terms: QuoteTemplateTerms;
}

/** 模板列表项（含元数据） */
export interface QuoteTemplate extends QuoteTemplateConfig {
  id: string;
  companyName: string;
  description: string;
  isDefault: boolean;
  updatedAt: string;
  createdAt: string;
}

/** 可选字段（新建/编辑时勾选） */
export const TEMPLATE_FIELD_OPTIONS = [
  "产品名称",
  "规格型号",
  "数量",
  "单价",
  "金额",
  "交付周期",
  "折扣",
  "税率",
  "备注",
  "小计",
] as const;

export type TemplateField = (typeof TEMPLATE_FIELD_OPTIONS)[number];

/** 预览示例数据（虚拟一条报价单，供后台预览渲染） */
export interface QuotePreviewProduct {
  name: string;
  model: string;
  qty: number;
  unit: string;
  price: number;
  amount: number;
  deliveryCycle?: string;
  discount?: number;
}

export interface QuotePreviewSample {
  quoteNo: string;
  date: string;
  validUntil: string;
  currency: string;
  company: { name: string; enName: string; address: string; phone: string };
  customer: { name: string; contact: string; phone: string; email: string };
  products: QuotePreviewProduct[];
  remark?: string;
}

export const DEFAULT_PREVIEW_SAMPLE: QuotePreviewSample = {
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
    { name: "工业级边缘计算网关", model: "GY-ECG-8000", qty: 12, unit: "台", price: 6800, amount: 81600, deliveryCycle: "15 个工作日" },
    { name: "光纤终端模块", model: "SFP-TG-SR", qty: 40, unit: "个", price: 1200, amount: 48000, deliveryCycle: "7 个工作日", discount: 5 },
    { name: "工业电源模块", model: "PWR-240-48", qty: 12, unit: "台", price: 680, amount: 8160, deliveryCycle: "10 个工作日" },
    { name: "现场安装调试服务", model: "BPK-100", qty: 12, unit: "套", price: 1200, amount: 14400, deliveryCycle: "按现场排期" },
  ],
  remark: "以上报价含 13% 增值税专用发票，不含现场差旅费用。",
};

export const THEME_COLOR_PRESETS = [
  "#1677ff",
  "#2563eb",
  "#0ea5e9",
  "#22c55e",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0f172a",
] as const;
