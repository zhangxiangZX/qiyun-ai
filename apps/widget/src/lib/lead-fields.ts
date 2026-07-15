export const LEAD_FIELD_LABELS: Record<string, string> = {
  name: "姓名或称呼",
  phone: "电话",
  email: "邮箱",
  company: "公司",
  requirement: "需求描述",
  productType: "产品类型",
  environment: "使用环境",
  dimensions: "尺寸",
  quantity: "数量",
  drawingAttachment: "图纸附件说明",
};

export const LEAD_FIELD_PLACEHOLDERS: Record<string, string> = {
  name: "请输入您的姓名",
  phone: "请输入联系电话",
  email: "请输入工作邮箱",
  company: "请输入公司名称",
  requirement: "请描述报价/选型/图纸等需求",
  productType: "如：工业冷水机",
  environment: "如：车间恒温",
  dimensions: "如：800×600mm",
  quantity: "如：2 台",
  drawingAttachment: "可说明是否有 CAD/PDF 图纸",
};

export const DEFAULT_LEAD_FIELDS = [
  "name",
  "phone",
  "email",
  "company",
  "requirement",
  "productType",
  "quantity",
];

export function resolveLeadFields(fields?: string[]): string[] {
  return fields && fields.length > 0 ? fields : DEFAULT_LEAD_FIELDS;
}
