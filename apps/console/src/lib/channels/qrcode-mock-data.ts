import type { QrcodeEntry, QrcodeOverviewStats } from "./qrcode-types";

const FEATURED: QrcodeEntry[] = [
  {
    id: "qr-1",
    name: "产品手册下载二维码",
    remark: "供展会现场扫码下载",
    kind: "qrcode",
    linkedContent: "产品手册.pdf (2.4MB)",
    creator: "张伟",
    todayVisits: 23,
    totalVisits: 1256,
    uv: 826,
    status: "active",
    statusNote: "永久有效",
    createdAt: "2025-03-15T10:30:00.000Z",
    linkId: "1",
  },
  {
    id: "qr-2",
    name: "官网在线客服入口二维码",
    remark: "官网右下角悬浮入口",
    kind: "qrcode",
    linkedContent: "企业微信客服",
    creator: "李娜",
    todayVisits: 45,
    totalVisits: 2341,
    uv: 1580,
    status: "active",
    statusNote: "永久有效",
    createdAt: "2025-02-20T14:15:00.000Z",
    linkId: "5",
  },
  {
    id: "qr-3",
    name: "销售名片二维码",
    remark: "销售团队个人名片",
    kind: "qrcode",
    linkedContent: "张伟个人主页",
    creator: "张伟",
    todayVisits: 12,
    totalVisits: 567,
    uv: 412,
    status: "active",
    statusNote: "永久有效",
    createdAt: "2025-04-01T09:00:00.000Z",
    linkId: "2",
  },
  {
    id: "sl-4",
    name: "户外机柜产品页链接",
    remark: "户外机柜系列产品介绍",
    kind: "sales_link",
    linkedContent: "产品页（共8款产品）",
    creator: "王磊",
    todayVisits: 31,
    totalVisits: 1089,
    uv: 745,
    status: "active",
    statusNote: "永久有效",
    createdAt: "2025-03-28T11:20:00.000Z",
    linkId: "2",
  },
  {
    id: "sl-5",
    name: "询价申请表单链接",
    remark: "客户在线提交询价需求",
    kind: "sales_link",
    linkedContent: "https://qiyun.ai/inquiry/form",
    creator: "陈晨",
    todayVisits: 18,
    totalVisits: 892,
    uv: 634,
    status: "active",
    statusNote: "永久有效",
    createdAt: "2025-04-05T16:45:00.000Z",
    linkId: "3",
  },
  {
    id: "qr-6",
    name: "展会名片二维码（上海展）",
    remark: "2025上海工业博览会",
    kind: "qrcode",
    linkedContent: "展会专属落地页",
    creator: "刘洋",
    todayVisits: 0,
    totalVisits: 423,
    uv: 312,
    status: "paused",
    statusNote: "2025-06-01 到期",
    createdAt: "2025-05-10T08:00:00.000Z",
    linkId: "4",
  },
];

const EXTRA_NAMES: Array<{
  name: string;
  remark: string;
  kind: QrcodeEntry["kind"];
  linkedContent: string;
  status: QrcodeEntry["status"];
  statusNote: string;
}> = [
  { name: "6月新品推广活动", remark: "Google Ads 投放", kind: "sales_link", linkedContent: "qiyun.ai/1r6lx7k", status: "active", statusNote: "永久有效" },
  { name: "行业解决方案白皮书", remark: "邮件营销附件", kind: "sales_link", linkedContent: "白皮书下载页", status: "active", statusNote: "永久有效" },
  { name: "线上展会直播入口", remark: "抖音渠道", kind: "qrcode", linkedContent: "直播预约页", status: "active", statusNote: "永久有效" },
  { name: "售后服务支持入口", remark: "官网底部", kind: "qrcode", linkedContent: "售后工单页", status: "active", statusNote: "永久有效" },
  { name: "产品目录下载页", remark: "WhatsApp 分发", kind: "sales_link", linkedContent: "目录 PDF", status: "paused", statusNote: "待审核" },
  { name: "合作伙伴申请表单", remark: "LinkedIn 渠道", kind: "sales_link", linkedContent: "合作申请表", status: "active", statusNote: "永久有效" },
  { name: "工控机选型助手", remark: "选型页入口", kind: "qrcode", linkedContent: "AI 选型页", status: "active", statusNote: "永久有效" },
  { name: "华南区渠道专属链接", remark: "渠道合作", kind: "sales_link", linkedContent: "渠道落地页", status: "active", statusNote: "永久有效" },
  { name: "德国客户资料包", remark: "海外展会", kind: "qrcode", linkedContent: "英文产品册.zip", status: "expired", statusNote: "2025-05-01 到期" },
  { name: "春季促销专题页", remark: "邮件推送", kind: "sales_link", linkedContent: "促销专题", status: "expired", statusNote: "2025-04-30 到期" },
  { name: "机柜安装视频二维码", remark: "售后资料", kind: "qrcode", linkedContent: "安装教程视频", status: "active", statusNote: "永久有效" },
  { name: "华东代理商入口", remark: "代理商专用", kind: "sales_link", linkedContent: "代理门户", status: "paused", statusNote: "暂停维护" },
  { name: "工厂参观预约", remark: "高意向客户", kind: "qrcode", linkedContent: "预约表单", status: "active", statusNote: "永久有效" },
  { name: "备件询价快捷入口", remark: "老客户复购", kind: "sales_link", linkedContent: "备件清单", status: "active", statusNote: "永久有效" },
  { name: "CE 认证资料下载", remark: "合规文档", kind: "qrcode", linkedContent: "认证包.pdf", status: "paused", statusNote: "待更新" },
  { name: "北美市场落地页", remark: "Google Ads", kind: "sales_link", linkedContent: "英文产品页", status: "active", statusNote: "永久有效" },
  { name: "展会抽奖活动码", remark: "深圳电子展", kind: "qrcode", linkedContent: "抽奖页", status: "paused", statusNote: "活动结束" },
  { name: "老客户回访链接", remark: "CRM 外呼", kind: "sales_link", linkedContent: "满意度调查", status: "paused", statusNote: "暂停投放" },
  { name: "技术白皮书 V2", remark: "升级版资料", kind: "qrcode", linkedContent: "白皮书.pdf", status: "active", statusNote: "永久有效" },
  { name: "经销商培训资料", remark: "渠道培训", kind: "qrcode", linkedContent: "培训课件", status: "paused", statusNote: "下期开课" },
  { name: "样机申请入口", remark: "试用转化", kind: "sales_link", linkedContent: "样机申请表", status: "active", statusNote: "永久有效" },
  { name: "年度客户答谢会", remark: "线下活动", kind: "qrcode", linkedContent: "邀请函页", status: "expired", statusNote: "2025-01-15 到期" },
];

const CREATORS = ["张伟", "李娜", "王磊", "陈晨", "刘洋"];

function buildExtras(): QrcodeEntry[] {
  return EXTRA_NAMES.map((item, index) => {
    const day = String((index % 28) + 1).padStart(2, "0");
    const month = index % 2 === 0 ? "05" : "06";
    return {
      id: `gen-${index + 7}`,
      name: item.name,
      remark: item.remark,
      kind: item.kind,
      linkedContent: item.linkedContent,
      creator: CREATORS[index % CREATORS.length] ?? "张伟",
      todayVisits: item.status === "active" ? 5 + (index % 40) : 0,
      totalVisits: 120 + index * 47,
      uv: 80 + index * 31,
      status: item.status,
      statusNote: item.statusNote,
      createdAt: `2025-${month}-${day}T${String(9 + (index % 8)).padStart(2, "0")}:00:00.000Z`,
      linkId: String((index % 7) + 1),
    };
  });
}

export const mockQrcodeEntries: QrcodeEntry[] = [...FEATURED, ...buildExtras()];

export const mockQrcodeOverview: QrcodeOverviewStats = {
  qrcodeVisits: 8642,
  qrcodeVisitsGrowth: 18.6,
  salesLinkVisits: 12785,
  salesLinkVisitsGrowth: 23.4,
  uniqueVisitors: 7523,
  uniqueVisitorsGrowth: 16.3,
  inquiryConversions: 486,
  inquiryConversionsGrowth: 21.7,
};

export function countByStatus(entries: QrcodeEntry[]): Record<QrcodeEntry["status"] | "all", number> {
  const counts = {
    all: entries.length,
    active: 0,
    paused: 0,
    expired: 0,
    draft: 0,
  };
  for (const entry of entries) {
    counts[entry.status] += 1;
  }
  return counts;
}
