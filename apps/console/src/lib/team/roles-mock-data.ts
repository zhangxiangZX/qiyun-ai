export type RoleItem = {
  id: string;
  name: string;
  code: string;
  description: string;
  memberCount: number;
  icon: string;
  iconBg: string;
};

export type PermissionModule = {
  id: string;
  name: string;
  children?: Array<{ id: string; name: string }>;
};

/** 预览模式回退：V1 平台四角色 */
export const MOCK_ROLES: RoleItem[] = [
  {
    id: "owner",
    name: "企业所有者",
    code: "owner",
    description: "拥有工作区全部功能，可转移所有权与管理团队成员",
    memberCount: 1,
    icon: "👑",
    iconBg: "#fee2e2",
  },
  {
    id: "admin",
    name: "管理员",
    code: "admin",
    description: "管理机器人、知识库、渠道配置与团队成员，可处理全部询盘",
    memberCount: 2,
    icon: "🛡️",
    iconBg: "#dbeafe",
  },
  {
    id: "member",
    name: "销售成员",
    code: "member",
    description: "跟进询盘、报价与日历任务；销售数据默认仅看自己负责范围",
    memberCount: 4,
    icon: "🎯",
    iconBg: "#ffedd5",
  },
  {
    id: "viewer",
    name: "只读访客",
    code: "viewer",
    description: "仅可查看授权范围内的业务数据，不可新增或修改",
    memberCount: 1,
    icon: "👁️",
    iconBg: "#f1f5f9",
  },
];

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "customer",
    name: "客户管理",
    children: [
      { id: "customer_list", name: "客户列表" },
      { id: "customer_detail", name: "客户详情" },
    ],
  },
  {
    id: "inquiry",
    name: "询盘管理",
    children: [
      { id: "inquiry_list", name: "询盘列表" },
      { id: "inquiry_assign", name: "询盘分配" },
    ],
  },
  {
    id: "quote",
    name: "报价管理",
    children: [
      { id: "quote_list", name: "报价列表" },
      { id: "quote_template", name: "报价模板" },
      { id: "quote_approve", name: "报价审批" },
    ],
  },
  {
    id: "analytics",
    name: "数据分析",
    children: [
      { id: "analytics_funnel", name: "成交漏斗" },
      { id: "analytics_channel", name: "渠道分析" },
      { id: "analytics_export", name: "报表导出" },
    ],
  },
  {
    id: "settings",
    name: "系统设置",
    children: [
      { id: "settings_team", name: "团队成员" },
      { id: "settings_roles", name: "角色权限" },
      { id: "settings_logs", name: "操作日志" },
    ],
  },
];

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "export", "import", "setup"] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ROLE_MEMBERS_PREVIEW = [
  { name: "李娜", avatar: "李" },
  { name: "王磊", avatar: "王" },
  { name: "陈晨", avatar: "陈" },
];
