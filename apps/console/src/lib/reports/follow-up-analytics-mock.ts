export const FOLLOW_UP_KPIS = {
  totalCustomers: { value: 2856, trend: "+18.5%" },
  totalFollowUps: { value: 8642, trend: "+21.3%" },
  effectiveFollowUps: { value: 4215, trend: "+24.6%" },
  avgCycleDays: { value: 3.8, trend: "-0.4天" },
  conversionRate: { value: 15.6, trend: "+2.3%" },
};

export const FOLLOW_UP_TREND = [
  { label: "05-01", total: 210, effective: 98, newCustomers: 42 },
  { label: "05-08", total: 245, effective: 112, newCustomers: 48 },
  { label: "05-15", total: 268, effective: 128, newCustomers: 55 },
  { label: "05-22", total: 292, effective: 141, newCustomers: 61 },
  { label: "05-29", total: 318, effective: 156, newCustomers: 68 },
];

export const FOLLOW_UP_METHODS = [
  { label: "电话", value: 49.2, color: "#2563eb" },
  { label: "微信", value: 25.0, color: "#22c55e" },
  { label: "拜访", value: 14.5, color: "#f59e0b" },
  { label: "邮件", value: 5.9, color: "#8b5cf6" },
  { label: "其他", value: 5.4, color: "#94a3b8" },
];

export const FOLLOW_UP_RESULTS = [
  { label: "无效跟进", count: 1820, pct: 21.1 },
  { label: "待再次联系", count: 1540, pct: 17.8 },
  { label: "需求确认", count: 1286, pct: 14.9 },
  { label: "方案沟通", count: 986, pct: 11.4 },
  { label: "报价推进", count: 742, pct: 8.6 },
  { label: "成交客户", count: 268, pct: 3.1 },
];

export const FOLLOW_UP_TOP_SALES = [
  { rank: 1, name: "李娜", customers: 186, followUps: 428, effective: 218, rate: 18.6 },
  { rank: 2, name: "王磊", customers: 162, followUps: 396, effective: 201, rate: 17.2 },
  { rank: 3, name: "孙锐", customers: 148, followUps: 362, effective: 186, rate: 16.8 },
  { rank: 4, name: "郭涛", customers: 132, followUps: 318, effective: 164, rate: 15.9 },
  { rank: 5, name: "陈晨", customers: 118, followUps: 286, effective: 142, rate: 14.7 },
];

export const FOLLOW_UP_STAGE_CONVERSION = [
  { label: "初次接触", rate: 100, drop: null },
  { label: "需求确认", rate: 68.4, drop: 31.6 },
  { label: "方案沟通", rate: 42.8, drop: 25.6 },
  { label: "商务谈判", rate: 24.6, drop: 18.2 },
  { label: "成交客户", rate: 15.6, drop: 9.0 },
];

export const FOLLOW_UP_TIMELINESS = [
  { label: "当天跟进", value: 42.6, color: "#2563eb" },
  { label: "1-3 天", value: 31.2, color: "#22c55e" },
  { label: "4-7 天", value: 18.4, color: "#f59e0b" },
  { label: ">7 天", value: 7.8, color: "#ef4444" },
];

export type FollowUpRecordRow = {
  id: string;
  time: string;
  customer: string;
  contact: string;
  method: string;
  result: string;
  summary: string;
  nextTime: string;
  owner: string;
};

export const FOLLOW_UP_RECORDS: FollowUpRecordRow[] = [
  {
    id: "fu-1",
    time: "2025-05-31 14:20",
    customer: "杭州云创科技有限公司",
    contact: "王经理",
    method: "电话",
    result: "需求确认",
    summary: "确认全自动包装线产能需求，约定下周发送技术方案。",
    nextTime: "2025-06-05 10:00",
    owner: "李娜",
  },
  {
    id: "fu-2",
    time: "2025-05-31 11:05",
    customer: "浙江坚诚机械有限公司",
    contact: "张总",
    method: "微信",
    result: "报价推进",
    summary: "客户对报价单第 2 版折扣有异议，需内部审批后回复。",
    nextTime: "2025-06-02 15:30",
    owner: "王磊",
  },
  {
    id: "fu-3",
    time: "2025-05-30 16:40",
    customer: "苏州智造设备有限公司",
    contact: "刘工",
    method: "拜访",
    result: "方案沟通",
    summary: "现场查看产线布局，推荐 PK-500A 型号并记录安装空间限制。",
    nextTime: "2025-06-04 09:00",
    owner: "孙锐",
  },
  {
    id: "fu-4",
    time: "2025-05-30 10:18",
    customer: "宁波海威机电有限公司",
    contact: "陈小姐",
    method: "邮件",
    result: "待再次联系",
    summary: "已发送产品手册与案例，等待客户内部评审反馈。",
    nextTime: "2025-06-06 14:00",
    owner: "郭涛",
  },
  {
    id: "fu-5",
    time: "2025-05-29 17:22",
    customer: "无锡精科自动化股份",
    contact: "赵总",
    method: "电话",
    result: "成交客户",
    summary: "客户确认采购 2 台设备，已进入合同签署流程。",
    nextTime: "—",
    owner: "李娜",
  },
];
