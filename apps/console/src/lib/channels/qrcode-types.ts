export type QrcodeEntryKind = "qrcode" | "sales_link";

export type QrcodeEntryStatus = "active" | "paused" | "expired" | "draft";

export interface QrcodeEntry {
  id: string;
  name: string;
  remark: string;
  kind: QrcodeEntryKind;
  linkedContent: string;
  creator: string;
  todayVisits: number;
  totalVisits: number;
  uv: number;
  status: QrcodeEntryStatus;
  statusNote: string;
  createdAt: string;
  /** 关联销售链接详情页 ID，有则跳转详情 */
  linkId?: string;
}

export interface QrcodeOverviewStats {
  qrcodeVisits: number;
  qrcodeVisitsGrowth: number;
  salesLinkVisits: number;
  salesLinkVisitsGrowth: number;
  uniqueVisitors: number;
  uniqueVisitorsGrowth: number;
  inquiryConversions: number;
  inquiryConversionsGrowth: number;
}

export type QrcodeStatusTab = "all" | QrcodeEntryStatus;
