export const AUDIT_STATS = {
  total: { value: 1258, trend: "+12%", up: true },
  success: { value: 1158, trend: "+10%", up: true },
  failure: { value: 100, trend: "-5%", up: false },
  activeUsers: { value: 28, trend: "+7%", up: true },
};

export type AuditLogDisplayRow = {
  id: string;
  time: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  module: string;
  actionType: string;
  content: string;
  result: "success" | "failure";
  ip: string;
  browser?: string;
  location?: string;
  changes?: Array<{ field: string; before: string; after: string }>;
  remark?: string;
};

export const AUDIT_DISPLAY_ROWS: AuditLogDisplayRow[] = [
  {
    id: "log-1",
    time: "2025-05-20 14:32:18",
    userName: "张伟",
    userAvatar: "张",
    userRole: "超级管理员",
    module: "客户管理",
    actionType: "更新",
    content: "更新客户：杭州云创科技有限公司",
    result: "success",
    ip: "123.56.18.204",
    browser: "Chrome 125 / Windows",
    location: "浙江 杭州",
    changes: [
      { field: "客户名称", before: "杭州云创科技", after: "杭州云创科技有限公司" },
      { field: "客户级别", before: "B级", after: "A级重点客户" },
      { field: "联系人", before: "王工", after: "王经理" },
      { field: "联系电话", before: "138****1234", after: "138****5678" },
      { field: "客户标签", before: "制造业", after: "制造业, 包装设备" },
    ],
  },
  {
    id: "log-2",
    time: "2025-05-20 13:15:42",
    userName: "李娜",
    userAvatar: "李",
    userRole: "销售经理",
    module: "报价管理",
    actionType: "发送",
    content: "发送报价单 Q-20240520-008 给客户",
    result: "success",
    ip: "123.56.18.205",
    location: "浙江 杭州",
  },
  {
    id: "log-3",
    time: "2025-05-20 11:08:33",
    userName: "王磊",
    userAvatar: "王",
    userRole: "销售专员",
    module: "询盘管理",
    actionType: "创建",
    content: "新建询盘 INQ-20240520-015",
    result: "success",
    ip: "123.56.18.206",
    location: "江苏 苏州",
  },
  {
    id: "log-4",
    time: "2025-05-19 17:45:10",
    userName: "陈晨",
    userAvatar: "陈",
    userRole: "市场专员",
    module: "渠道管理",
    actionType: "导出",
    content: "导出渠道分析报表（2025-05-01 ~ 2025-05-19）",
    result: "failure",
    ip: "123.56.18.207",
    location: "浙江 宁波",
    remark: "导出任务超时，请缩小时间范围后重试。",
  },
  {
    id: "log-5",
    time: "2025-05-19 10:22:05",
    userName: "张伟",
    userAvatar: "张",
    userRole: "超级管理员",
    module: "团队成员",
    actionType: "邀请",
    content: "邀请成员 sunrui@qiyun.com 加入团队",
    result: "success",
    ip: "123.56.18.204",
    location: "浙江 杭州",
  },
];
