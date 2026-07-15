export interface SalesLink {
  id: string;
  name: string;
  channel: "google_ads" | "zhanli" | "email" | "douyin" | "pc" | "whatsapp" | "linkedin";
  channelLabel: string;
  creator: string;
  creatorAvatar?: string;
  shortUrl: string;
  visits: number;
  inquiries: number;
  conversions: number;
  conversionRate: number;
  status: "active" | "inactive";
  lastUpdated: string;
}

export type SalesLinkChannel = SalesLink["channel"];

export const channelConfig: Record<SalesLinkChannel, { label: string; color: string }> = {
  google_ads: { label: "Google Ads", color: "#4285F4" },
  zhanli: { label: "独立站", color: "#0066CC" },
  email: { label: "邮件营销", color: "#EA4335" },
  douyin: { label: "社交媒体", color: "#000000" },
  pc: { label: "官网底部", color: "#666666" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
};

export interface ScanRecord {
  id: string;
  visitorName: string;
  linkName: string;
  channel: string;
  scanTime: string;
  location: string;
}
