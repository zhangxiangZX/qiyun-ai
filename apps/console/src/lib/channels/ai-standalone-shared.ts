import { PUBLIC_ENTRY_URL } from "@/lib/brand";

export type SelectionPageIcon = "shield" | "qrcode" | "quote";

export type AiStandaloneSection = "basic" | "content" | "fields" | "robot" | "postsubmit" | "submissions";

export interface SelectionPageItem {
  id: string;
  slug: string;
  name: string;
  editName: string;
  channels: string;
  botName: string;
  visits: number;
  inquiries: number;
  enabled: boolean;
  published: boolean;
  isDefault?: boolean;
  icon: SelectionPageIcon;
  pageUrl: string;
}

export const AI_STANDALONE_SECTIONS: { id: AiStandaloneSection; label: string }[] = [
  { id: "basic", label: "基础设置" },
  { id: "content", label: "页面内容" },
  { id: "fields", label: "表单字段" },
  { id: "robot", label: "机器人设置" },
  { id: "postsubmit", label: "提交后设置" },
  { id: "submissions", label: "提交记录" },
];

export const DEMO_SELECTION_PAGES: SelectionPageItem[] = [
  {
    id: "outdoor",
    slug: "outdoor-cabinet",
    name: "户外机柜 AI 选型助手",
    editName: "户外机柜 AI 选型助手（抖音专用页）",
    channels: "官网、抖音、微信",
    botName: "库滋玛 AI 产品选型助手",
    visits: 436,
    inquiries: 12,
    enabled: true,
    published: true,
    isDefault: true,
    icon: "shield",
    pageUrl: "/s/outdoor-cabinet",
  },
  {
    id: "stainless",
    slug: "stainless-cabinet",
    name: "不锈钢机柜选型页",
    editName: "不锈钢机柜选型页",
    channels: "官网、小红书",
    botName: "不锈钢机柜选型助手",
    visits: 268,
    inquiries: 5,
    enabled: true,
    published: true,
    icon: "shield",
    pageUrl: "/s/stainless-cabinet",
  },
  {
    id: "expo",
    slug: "expo-cabinet",
    name: "展会扫码选型页",
    editName: "展会扫码选型页",
    channels: "线下扫码、微信",
    botName: "展会专属选型助手",
    visits: 192,
    inquiries: 4,
    enabled: true,
    published: true,
    icon: "qrcode",
    pageUrl: "/s/expo-cabinet",
  },
  {
    id: "sales",
    slug: "sales-quote",
    name: "销售专属报价页",
    editName: "销售专属报价页",
    channels: "销售分享",
    botName: "销售报价助手",
    visits: 153,
    inquiries: 3,
    enabled: false,
    published: false,
    icon: "quote",
    pageUrl: "/s/sales-quote",
  },
];

export const NEW_PAGE_ID = "new";

export function getSelectionPage(pageId: string | null): SelectionPageItem {
  if (!pageId || pageId === NEW_PAGE_ID) {
    return {
      id: NEW_PAGE_ID,
      slug: "new-selection-page",
      name: "新建选型页",
      editName: "新建选型页",
      channels: "官网",
      botName: "库滋玛 AI 产品选型助手",
      visits: 0,
      inquiries: 0,
      enabled: false,
      published: false,
      icon: "shield",
      pageUrl: "/s/new-selection-page",
    };
  }
  return DEMO_SELECTION_PAGES.find((p) => p.id === pageId) ?? DEMO_SELECTION_PAGES[0];
}

export function parseAiStandaloneSection(value: string | null): AiStandaloneSection {
  if (
    value === "content" ||
    value === "fields" ||
    value === "robot" ||
    value === "postsubmit" ||
    value === "submissions"
  ) {
    return value;
  }
  return "basic";
}

export function buildAiStandaloneEditHref(pageId: string, section: AiStandaloneSection = "basic") {
  const params = new URLSearchParams({ page: pageId, section });
  return `/dashboard/bots/landing/edit?${params.toString()}`;
}

export function buildAiStandaloneNewHref(section: AiStandaloneSection = "basic") {
  return buildAiStandaloneEditHref(NEW_PAGE_ID, section);
}

export function resolveSelectionPagePublicUrl(slug: string): string {
  const path = `/s/${slug}`;
  return `${PUBLIC_ENTRY_URL}${path}`;
}

export function getPagePublicSlug(page: SelectionPageItem): string {
  return page.slug;
}
