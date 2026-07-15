export type SalesLinkChannel =
  | "google_ads" | "zhanli" | "email" | "douyin" | "pc"
  | "whatsapp" | "linkedin" | "other";

export type SalesLinkStatus = "active" | "inactive";

export interface SalesLinkRecord {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  channel: SalesLinkChannel;
  targetUrl: string | null;
  shortUrl: string | null;
  status: SalesLinkStatus;
  visits: number;
  inquiries: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const CHANNEL_LABELS: Record<SalesLinkChannel, string> = {
  google_ads: "Google Ads",
  zhanli: "链立站",
  email: "邮件营销",
  douyin: "社交媒体",
  pc: "官网底部",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  other: "其他",
};

export type ScanLogSource = "link" | "qrcode" | "unknown" | "other";

export interface ScanLogRecord {
  id: string;
  workspaceId: string;
  salesLinkId: string;
  source: ScanLogSource;
  visitor: string | null;
  referer: string | null;
  userAgent: string | null;
  scannedAt: string;
}

export interface ScanLogInput {
  workspaceId: string;
  salesLinkId: string;
  source: ScanLogSource;
  visitor?: string | null;
  referer?: string | null;
  userAgent?: string | null;
}
