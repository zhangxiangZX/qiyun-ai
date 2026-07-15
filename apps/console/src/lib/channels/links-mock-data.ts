import type { SalesLink, ScanRecord } from "./types";

export const channelConfig: Record<string, { color: string }> = {
  google_ads: { color: "#4285F4" },
  zhanli: { color: "#8B5CF6" },
  email: { color: "#F59E0B" },
  douyin: { color: "#000000" },
  pc: { color: "#3B82F6" },
  whatsapp: { color: "#25D366" },
  linkedin: { color: "#0A66C2" },
};

export const mockSalesLinks: SalesLink[] = [
  {
    id: "1",
    name: "6月新品推广活动",
    channel: "google_ads",
    channelLabel: "Google Ads",
    creator: "张伟",
    shortUrl: "qiyun.ai/1r6lx7k",
    visits: 482,
    inquiries: 31,
    conversions: 18,
    conversionRate: 6.89,
    status: "active",
    lastUpdated: "2024-06-01 10:32",
  },
  {
    id: "2",
    name: "工业电脑产品页",
    channel: "zhanli",
    channelLabel: "独立站",
    creator: "李娜",
    shortUrl: "qiyun.ai/1p8a3f",
    visits: 389,
    inquiries: 26,
    conversions: 14,
    conversionRate: 5.40,
    status: "active",
    lastUpdated: "2024-05-31 16:45",
  },
  {
    id: "3",
    name: "行业解决方案白皮书",
    channel: "email",
    channelLabel: "邮件营销",
    creator: "王磊",
    shortUrl: "qiyun.ai/b2nm9d",
    visits: 276,
    inquiries: 22,
    conversions: 11,
    conversionRate: 6.32,
    status: "active",
    lastUpdated: "2024-05-30 14:10",
  },
  {
    id: "4",
    name: "线上展会直播网",
    channel: "douyin",
    channelLabel: "社交媒体",
    creator: "陈晨",
    shortUrl: "qiyun.ai/t42kvx",
    visits: 351,
    inquiries: 19,
    conversions: 9,
    conversionRate: 5.13,
    status: "active",
    lastUpdated: "2024-05-30 09:20",
  },
  {
    id: "5",
    name: "售后服务支持入口",
    channel: "pc",
    channelLabel: "官网底部",
    creator: "刘洋",
    shortUrl: "qiyun.ai/s7klp",
    visits: 198,
    inquiries: 12,
    conversions: 6,
    conversionRate: 6.06,
    status: "active",
    lastUpdated: "2024-05-29 11:05",
  },
  {
    id: "6",
    name: "产品目录下载页",
    channel: "whatsapp",
    channelLabel: "WhatsApp",
    creator: "张伟",
    shortUrl: "qiyun.ai/d3f8h",
    visits: 142,
    inquiries: 7,
    conversions: 2,
    conversionRate: 1.41,
    status: "inactive",
    lastUpdated: "2024-05-28 17:40",
  },
  {
    id: "7",
    name: "合作伙伴申请表单",
    channel: "linkedin",
    channelLabel: "LinkedIn",
    creator: "李娜",
    shortUrl: "qiyun.ai/m9j2u",
    visits: 166,
    inquiries: 10,
    conversions: 5,
    conversionRate: 3.01,
    status: "active",
    lastUpdated: "2024-05-28 10:22",
  },
];

export const mockScanRecords: ScanRecord[] = [
  { id: "1", visitorName: "访客", linkName: "-", channel: "-", scanTime: "-", location: "-" },
  { id: "2", visitorName: "John Smith", linkName: "6月新品推广活动", channel: "Google Ads", scanTime: "06-01 10:38", location: "美国" },
  { id: "3", visitorName: "Alice Johnson", linkName: "工业电脑产品页", channel: "独立站", scanTime: "06-01 10:34", location: "德国" },
  { id: "4", visitorName: "王总", linkName: "行业解决方案白皮书", channel: "邮件营销", scanTime: "06-01 10:34", location: "中国" },
  { id: "5", visitorName: "Maria Garcia", linkName: "线上展会直播网", channel: "社交媒体", scanTime: "06-01 10:31", location: "西班牙" },
  { id: "6", visitorName: "张伟", linkName: "售后服务支持入口", channel: "官网底部", scanTime: "06-01 10:29", location: "中国" },
];

export function getSalesLinks(): Promise<SalesLink[]> {
  return Promise.resolve(mockSalesLinks);
}

export function getSalesLinkById(id: string): Promise<SalesLink | null> {
  return Promise.resolve(mockSalesLinks.find((link) => link.id === id) ?? null);
}

export function getScanRecords(): Promise<ScanRecord[]> {
  return Promise.resolve(mockScanRecords);
}

export const SALES_LINKS_KPIS = [
  { label: "链接总数", value: "128", trend: "较上周 ↑ 16.4%", iconTone: "brand" as const },
  { label: "今日访问", value: "1,256", trend: "较昨日 ↑ 18.7%", iconTone: "success" as const },
  { label: "今日留资", value: "78", trend: "较昨日 ↑ 12.3%", iconTone: "warning" as const },
  { label: "转化率", value: "6.21%", trend: "较昨日 ↑ 0.73pp", iconTone: "purple" as const },
];

export function getTopConversionLinks(limit = 5): SalesLink[] {
  return [...mockSalesLinks]
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, limit);
}
