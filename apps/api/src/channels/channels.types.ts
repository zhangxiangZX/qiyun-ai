export type ChannelId = "website" | "wechat" | "douyin" | "xhs";

export interface ChannelCatalogItem {
  id: ChannelId;
  name: string;
  iconKind: string;
  iconBg: string;
  description: string;
  /** 是否全局可用（官网 Widget 默认可用，其余渠道规划中需申请）。 */
  available: boolean;
}

export type ChannelAccessStatus = "requested" | "approved" | "rejected";

export interface ChannelAccessRequest {
  id: string;
  workspaceId: string;
  channelId: ChannelId;
  status: ChannelAccessStatus;
  requestedBy: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

/** 目录项叠加该工作区的接入申请状态，供前端一站式渲染。 */
export interface ChannelWithAccess extends ChannelCatalogItem {
  accessStatus: ChannelAccessStatus | null;
}

/** 静态渠道目录（与前端 channel-access 页面保持一致）。 */
export const CHANNEL_CATALOG: ChannelCatalogItem[] = [
  {
    id: "website",
    name: "官网 Widget",
    iconKind: "website",
    iconBg: "#2563eb",
    description: "将 AI 选型助手嵌入企业官网，访客直接在线咨询、获取报价。",
    available: true,
  },
  {
    id: "wechat",
    name: "企业微信",
    iconKind: "wechat",
    iconBg: "#07c160",
    description: "接入企业微信客服通道，在企微对话中嵌入 AI 助手。",
    available: false,
  },
  {
    id: "douyin",
    name: "抖音",
    iconKind: "douyin",
    iconBg: "#fe2c55",
    description: "通过抖音企业号落地页、私信自动回复接入 AI 选型。",
    available: false,
  },
  {
    id: "xhs",
    name: "小红书",
    iconKind: "xhs",
    iconBg: "#ff2442",
    description: "在小红书品牌主页或笔记评论中引导至 AI 选型页。",
    available: false,
  },
];
