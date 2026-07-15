const MODULE_LABELS: Record<string, string> = {
  inquiry: "询盘",
  quote: "报价",
  quote_template: "报价模板",
  lead: "线索",
  member: "成员",
  knowledge: "知识库",
  document: "资料",
  bot: "助手",
  auth: "账号",
  workspace: "企业空间",
  site: "站点",
  notification: "通知",
  channel: "渠道",
  selection: "选型页",
  settings: "业务规则",
};

const ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "编辑",
  assign: "分配",
  batch_assign: "批量分配",
  intent_level: "修改意向等级",
  invalid: "标记无效",
  lost: "标记丢单",
  customer_info: "补充客户资料",
  convert_to_quote: "转报价",
  copy: "复制",
  send: "发送",
  deal: "标记成交",
  void: "作废",
  valid_until: "修改有效期",
  follow_up: "跟进",
  status_change: "状态变更",
  public_link_rotate: "生成公开链接",
  set_default: "设为默认",
  delete: "删除",
  upload: "上传",
  publish: "发布",
  invite: "邀请",
  remove: "移除",
  change_role: "修改角色",
  rotate_key: "轮换密钥",
  login: "登录",
  reset_password: "重置密码",
};

const DETAIL_FIELD_LABELS: Record<string, string> = {
  customerName: "客户",
  ownerId: "负责人",
  quoteId: "报价 ID",
  newQuoteId: "新报价 ID",
  templateName: "模板名称",
  tokenPrefix: "链接前缀",
  inquiryIds: "询盘列表",
  name: "名称",
  fileName: "文件名",
  email: "邮箱",
  role: "角色",
  stage: "阶段",
};

function detailValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getAuditModuleLabel(module: string): string {
  return MODULE_LABELS[module] ?? module;
}

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatAuditSummary(
  module: string,
  action: string,
  detail: Record<string, unknown> | null,
): string {
  const moduleLabel = getAuditModuleLabel(module);
  const actionLabel = getAuditActionLabel(action);
  if (!detail || Object.keys(detail).length === 0) {
    return `${moduleLabel} · ${actionLabel}`;
  }
  const parts = Object.entries(detail)
    .slice(0, 3)
    .map(([key, value]) => {
      const label = DETAIL_FIELD_LABELS[key] ?? key;
      const text = detailValue(value);
      return text ? `${label}：${text}` : null;
    })
    .filter((item): item is string => Boolean(item));
  if (parts.length === 0) {
    return `${moduleLabel} · ${actionLabel}`;
  }
  return `${moduleLabel} · ${actionLabel}（${parts.join("；")}）`;
}

export interface AuditEntryView {
  moduleLabel: string;
  actionLabel: string;
  summary: string;
}

export function enrichAuditEntry<T extends { module: string; action: string; detail: Record<string, unknown> | null }>(
  entry: T,
): T & AuditEntryView {
  return {
    ...entry,
    moduleLabel: getAuditModuleLabel(entry.module),
    actionLabel: getAuditActionLabel(entry.action),
    summary: formatAuditSummary(entry.module, entry.action, entry.detail),
  };
}
