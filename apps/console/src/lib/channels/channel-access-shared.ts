import { resolveSelectionPagePublicUrl } from "@/lib/channels/ai-standalone-shared";
import { WECHAT_OFFICIAL_ACCOUNT_SOURCE } from "@/lib/public/acquisition-source";

export type ChannelAccessId = "douyin" | "xhs" | "wechat" | "website";

export type ChannelConfigTab = "basic" | "params" | "redirect" | "lead" | "advanced";

export type DouyinAccessMethod = "enterprise" | "dm_auto" | "live" | "other";

export interface ChannelAccessItem {
  id: ChannelAccessId;
  name: string;
  accessLabel: string;
  enabled: boolean;
  createdAt: string;
  monthlyVisits: number;
  monthlyInquiries: number;
  group: string;
  iconBg: string;
  iconKind: "douyin" | "xhs" | "wechat" | "website";
  sourceParam: string;
  accessMethod?: DouyinAccessMethod;
  guideSteps: string[];
}

export const CHANNEL_CONFIG_TABS: { id: ChannelConfigTab; label: string }[] = [
  { id: "basic", label: "基础配置" },
  { id: "params", label: "参数设置" },
  { id: "redirect", label: "跳转规则" },
  { id: "lead", label: "线索标识" },
  { id: "advanced", label: "高级设置" },
];

export const CHANNEL_GROUP_OPTIONS = ["短视频平台", "社交平台", "搜索引擎", "官网"];

export const DOUYIN_ACCESS_METHODS: {
  id: DouyinAccessMethod;
  label: string;
  description: string;
  icon: string;
}[] = [
  { id: "enterprise", label: "抖音企业号", description: "通过企业号主页或私信挂载链接", icon: "building" },
  { id: "dm_auto", label: "私信自动回复", description: "在私信自动回复中配置链接", icon: "message" },
  { id: "live", label: "视频/直播挂载", description: "在视频或直播间挂载小风车", icon: "video" },
  { id: "other", label: "其他方式", description: "通过其他方式引导用户访问", icon: "more" },
];

const DEFAULT_LANDING_SLUG = "outdoor-cabinet";

export function buildChannelLandingUrl(sourceParam: string): string {
  return `${resolveSelectionPagePublicUrl(DEFAULT_LANDING_SLUG)}?ch=${sourceParam}`;
}

export const DEMO_CHANNEL_ACCESS_ITEMS: ChannelAccessItem[] = [
  {
    id: "douyin",
    name: "抖音",
    accessLabel: "接入方式：抖音企业号落地页链接",
    enabled: true,
    createdAt: "2024-07-06 15:30",
    monthlyVisits: 1238,
    monthlyInquiries: 186,
    group: "短视频平台",
    iconBg: "#111827",
    iconKind: "douyin",
    sourceParam: "douyin",
    accessMethod: "enterprise",
    guideSteps: [
      "登录抖音企业号后台",
      "进入【主页管理】-【官网链接】",
      "粘贴复制的落地页链接",
      "保存并发布",
    ],
  },
  {
    id: "xhs",
    name: "小红书",
    accessLabel: "接入方式：落地页链接",
    enabled: true,
    createdAt: "2024-07-06 15:25",
    monthlyVisits: 862,
    monthlyInquiries: 95,
    group: "社交平台",
    iconBg: "#ef4444",
    iconKind: "xhs",
    sourceParam: "xhs",
    guideSteps: [
      "登录小红书专业号后台",
      "进入【经营工具】-【落地页】",
      "粘贴复制的落地页链接",
      "提交审核并发布",
    ],
  },
  {
    id: "wechat",
    name: "微信",
    accessLabel: "接入方式：公众号菜单 / 自动回复 / 图文链接",
    enabled: true,
    createdAt: "2024-07-05 11:20",
    monthlyVisits: 654,
    monthlyInquiries: 72,
    group: "社交平台",
    iconBg: "#22c55e",
    iconKind: "wechat",
    sourceParam: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
    guideSteps: [
      "登录微信公众平台",
      "进入【自定义菜单】或【自动回复】",
      "粘贴带 source=wechat_official_account 的落地页链接",
      "保存并同步到公众号（无需对接消息 API）",
    ],
  },
  {
    id: "website",
    name: "官网",
    accessLabel: "接入方式：网站浮窗 / 按钮链接",
    enabled: false,
    createdAt: "2024-07-04 09:15",
    monthlyVisits: 0,
    monthlyInquiries: 0,
    group: "官网",
    iconBg: "#3b82f6",
    iconKind: "website",
    sourceParam: "website",
    guideSteps: [
      "进入官网 Widget 配置页",
      "复制 Widget 安装代码或按钮链接",
      "部署到官网对应页面",
      "验证浮窗可正常打开选型页",
    ],
  },
];

export function getChannelConfigHint(channelId: ChannelAccessId): string {
  if (channelId === "douyin") {
    return "将以下链接配置到抖音企业号资料页、私信自动回复或视频/直播间挂载链接中";
  }
  if (channelId === "xhs") {
    return "将以下链接配置到小红书专业号落地页或笔记/私信引导入口";
  }
  if (channelId === "wechat") {
    return "将以下链接（含 source=wechat_official_account）配置到公众号菜单、自动回复或图文消息中；无需对接公众号消息 API";
  }
  return "将以下链接配置到官网浮窗、按钮或导航入口中";
}
