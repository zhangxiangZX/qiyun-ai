import type { BotListItem, BotStatus } from "./types";

export type AssistantChannelId = "website" | "douyin" | "xhs" | "wechat";

export interface AssistantChannelTag {
  id: AssistantChannelId;
  label: string;
}

export interface AssistantListRow {
  id: string;
  name: string;
  description: string;
  channels: AssistantChannelTag[];
  extraChannelCount?: number;
  group: string;
  status: BotStatus;
  updatedAt: string;
  updatedBy: string;
  avatarBg: string;
  avatarKind: "bot" | "tiktok" | "xhs" | "wechat" | "globe" | "calc" | "gift";
}

const CHANNEL_META: Record<AssistantChannelId, AssistantChannelTag> = {
  website: { id: "website", label: "官网" },
  douyin: { id: "douyin", label: "抖音" },
  xhs: { id: "xhs", label: "小红书" },
  wechat: { id: "wechat", label: "微信" },
};

const DEMO_ROWS: AssistantListRow[] = [
  {
    id: "demo-website",
    name: "库滋玛 AI 助手（官网）",
    description: "官网默认助手，提供产品咨询与选型推荐服务",
    channels: [CHANNEL_META.website],
    group: "官网助手",
    status: "enabled",
    updatedAt: "2024-07-06T15:30:00.000Z",
    updatedBy: "张先生",
    avatarBg: "#2563eb",
    avatarKind: "bot",
  },
  {
    id: "demo-douyin",
    name: "抖音智能助手",
    description: "抖音渠道专用助手，自动回复用户咨询",
    channels: [CHANNEL_META.douyin],
    group: "短视频渠道",
    status: "enabled",
    updatedAt: "2024-07-06T14:20:00.000Z",
    updatedBy: "张先生",
    avatarBg: "#111827",
    avatarKind: "tiktok",
  },
  {
    id: "demo-xhs",
    name: "小红书助手",
    description: "小红书平台专属助手，解答产品相关问题",
    channels: [CHANNEL_META.xhs],
    group: "社交媒体",
    status: "enabled",
    updatedAt: "2024-07-06T11:45:00.000Z",
    updatedBy: "李女士",
    avatarBg: "#ef4444",
    avatarKind: "xhs",
  },
  {
    id: "demo-wechat",
    name: "微信咨询助手",
    description: "微信公众号微信客服专用助手",
    channels: [CHANNEL_META.wechat],
    group: "私域渠道",
    status: "enabled",
    updatedAt: "2024-07-05T18:20:00.000Z",
    updatedBy: "王先生",
    avatarBg: "#22c55e",
    avatarKind: "wechat",
  },
  {
    id: "demo-selection",
    name: "产品选型助手 v2.0",
    description: "针对户外机柜产品选型的专业助手",
    channels: [CHANNEL_META.website, CHANNEL_META.douyin, CHANNEL_META.xhs],
    extraChannelCount: 1,
    group: "产品助手",
    status: "enabled",
    updatedAt: "2024-07-05T16:10:00.000Z",
    updatedBy: "张先生",
    avatarBg: "#2563eb",
    avatarKind: "bot",
  },
  {
    id: "demo-quote",
    name: "报价计算助手（测试版）",
    description: "提供快速报价估算服务",
    channels: [CHANNEL_META.website],
    group: "工具助手",
    status: "draft",
    updatedAt: "2024-07-04T10:30:00.000Z",
    updatedBy: "张先生",
    avatarBg: "#3b82f6",
    avatarKind: "calc",
  },
  {
    id: "demo-overseas",
    name: "海外客户助手",
    description: "英文场景助手，服务海外客户咨询",
    channels: [CHANNEL_META.website],
    group: "国际化",
    status: "enabled",
    updatedAt: "2024-07-03T09:15:00.000Z",
    updatedBy: "李女士",
    avatarBg: "#1e40af",
    avatarKind: "globe",
  },
  {
    id: "demo-promo",
    name: "促销活动助手",
    description: "活动专属助手，解答促销政策",
    channels: [CHANNEL_META.douyin, CHANNEL_META.wechat],
    group: "活动助手",
    status: "disabled",
    updatedAt: "2024-07-02T17:40:00.000Z",
    updatedBy: "王先生",
    avatarBg: "#3b82f6",
    avatarKind: "gift",
  },
];

function inferChannels(name: string): AssistantChannelTag[] {
  if (name.includes("抖音")) return [CHANNEL_META.douyin];
  if (name.includes("小红书")) return [CHANNEL_META.xhs];
  if (name.includes("微信")) return [CHANNEL_META.wechat];
  if (name.includes("海外") || name.includes("英文")) return [CHANNEL_META.website];
  return [CHANNEL_META.website];
}

function inferGroup(name: string): string {
  if (name.includes("抖音") || name.includes("短视频")) return "短视频渠道";
  if (name.includes("小红书")) return "社交媒体";
  if (name.includes("微信")) return "私域渠道";
  if (name.includes("销售")) return "私域渠道";
  if (name.includes("内部")) return "工具助手";
  if (name.includes("报价") || name.includes("计算")) return "工具助手";
  if (name.includes("选型") || name.includes("产品")) return "产品助手";
  return "官网助手";
}

function inferAvatar(name: string): Pick<AssistantListRow, "avatarBg" | "avatarKind"> {
  if (name.includes("抖音")) return { avatarBg: "#111827", avatarKind: "tiktok" };
  if (name.includes("小红书")) return { avatarBg: "#ef4444", avatarKind: "xhs" };
  if (name.includes("微信")) return { avatarBg: "#22c55e", avatarKind: "wechat" };
  if (name.includes("海外")) return { avatarBg: "#1e40af", avatarKind: "globe" };
  if (name.includes("报价")) return { avatarBg: "#3b82f6", avatarKind: "calc" };
  return { avatarBg: "#2563eb", avatarKind: "bot" };
}

const UPDATERS = ["张先生", "李女士", "王先生"];

function inferUpdater(botId: string): string {
  let hash = 0;
  for (let i = 0; i < botId.length; i += 1) {
    hash = (hash + botId.charCodeAt(i)) % UPDATERS.length;
  }
  return UPDATERS[hash] ?? UPDATERS[0];
}

export function enrichBotListItem(bot: BotListItem, description?: string): AssistantListRow {
  const avatar = inferAvatar(bot.name);
  return {
    id: bot.id,
    name: bot.name,
    description:
      description ??
      (bot.knowledgeBaseCount > 0
        ? `已绑定 ${bot.knowledgeBaseCount} 个知识库，支持产品咨询与智能问答`
        : "智能助手，支持产品咨询与选型推荐"),
    channels: inferChannels(bot.name),
    group: inferGroup(bot.name),
    status: bot.status,
    updatedAt: bot.updatedAt,
    updatedBy: inferUpdater(bot.id),
    ...avatar,
  };
}

export function getAssistantListRows(
  bots: BotListItem[],
  descriptions: Record<string, string>,
): AssistantListRow[] {
  if (bots.length === 0) return DEMO_ROWS;
  return bots.map((bot) => enrichBotListItem(bot, descriptions[bot.id]));
}

export const ASSISTANT_GROUP_OPTIONS = [
  "全部",
  "官网助手",
  "短视频渠道",
  "社交媒体",
  "私域渠道",
  "产品助手",
  "工具助手",
  "活动助手",
  "国际化",
];

/** V1 验收可见的分组（隐藏多渠道等 V2 分类） */
export const ASSISTANT_GROUP_OPTIONS_V1 = ["全部", "官网助手", "产品助手"];

export const ASSISTANT_CHANNEL_OPTIONS = ["全部", "官网", "抖音", "小红书", "微信"];

/** V1 仅官网 Widget 渠道 */
export const ASSISTANT_CHANNEL_OPTIONS_V1 = ["全部", "官网"];
