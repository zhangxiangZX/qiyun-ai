// 操作日志前端类型定义
// 字段与后端 apps/api/src/audit/audit.repository.ts 的 AuditEntry 对齐。
// GET /audit-logs 返回 AuditEntry[]（envelope 由 apiRequest 解包）。

export interface AuditEntry {
  id: string;
  workspaceId: string;
  userId: string | null;
  module: string;
  action: string;
  targetId: string | null;
  ip: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
  moduleLabel?: string;
  actionLabel?: string;
  summary?: string;
}

/** 业务模块中文标签（对应后端 module 值） */
export const AUDIT_MODULE_LABELS: Record<string, string> = {
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
  account: "个人设置",
};

/** 操作动作中文标签（对应后端 action 值） */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
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
  rotate_key: "轮换密钥",
  login: "登录",
  logout: "退出登录",
  disable: "停用",
  enable: "启用",
  reset_password: "重置密码",
  change_role: "修改角色",
  invite: "邀请",
  remove: "移除",
  upload: "上传",
  delete: "删除",
  publish: "发布",
};

export function getAuditModuleLabel(module: string): string {
  return AUDIT_MODULE_LABELS[module] ?? module;
}

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/** 用于筛选下拉的可选模块（覆盖常见值） */
export const AUDIT_MODULE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "inquiry", label: "询盘" },
  { value: "quote", label: "报价" },
  { value: "quote_template", label: "报价模板" },
  { value: "lead", label: "线索" },
  { value: "member", label: "成员" },
  { value: "knowledge", label: "知识库" },
  { value: "document", label: "资料" },
  { value: "bot", label: "助手" },
  { value: "settings", label: "业务规则" },
  { value: "account", label: "个人设置" },
  { value: "auth", label: "账号" },
  { value: "workspace", label: "企业空间" },
  { value: "site", label: "站点" },
  { value: "channel", label: "渠道" },
  { value: "selection", label: "选型页" },
];
