import { DEMO_SELECTION_PAGES, type SelectionPageItem } from "@/lib/channels/ai-standalone-shared";
import { PUBLIC_ENTRY_URL } from "@/lib/brand";

export interface ProductChip {
  id: string;
  label: string;
}

export interface SelectionFormField {
  id: string;
  label: string;
  type: "text" | "tel" | "textarea" | "file";
  required: boolean;
  placeholder: string;
  span?: 1 | 2;
}

export interface CompletenessItem {
  id: string;
  label: string;
  value: string;
  done: boolean;
}

export interface DemoChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  followUpList?: string[];
}

export interface SelectionPagePublicConfig {
  pageId: string;
  slug: string;
  enabled: boolean;
  published: boolean;
  sourceId: string;
  botId?: string;
  header: {
    title: string;
    subtitle: string;
    brandLetter: string;
  };
  welcome: {
    title: string;
    highlight: string;
    chips: string[];
  };
  productChips: ProductChip[];
  defaultProduct: string;
  robot: {
    openingMessage: string;
    recommendedQuestions: string[];
  };
  demoMessages: DemoChatMessage[];
  completeness: {
    percent: number;
    items: CompletenessItem[];
  };
  upload: {
    title: string;
    hint: string;
    buttonLabel: string;
    sampleFileName: string;
    sampleFileSize: string;
  };
  form: {
    fields: SelectionFormField[];
    privacyNote: string;
  };
  footer: {
    continueLabel: string;
    submitLabel: string;
    submitSub: string;
  };
  postSubmit: {
    successTitle: string;
    successMessage: string;
  };
}

const PAGE_ID_TO_SLUG: Record<string, string> = {
  outdoor: "outdoor-cabinet",
  stainless: "stainless-cabinet",
  expo: "expo-cabinet",
  sales: "sales-quote",
};

const SLUG_TO_PAGE_ID = Object.fromEntries(
  Object.entries(PAGE_ID_TO_SLUG).map(([pageId, slug]) => [slug, pageId]),
) as Record<string, string>;

export function getSelectionPageSlug(pageId: string): string {
  return PAGE_ID_TO_SLUG[pageId] ?? pageId;
}

export function getSelectionPageIdFromSlug(slug: string): string {
  return SLUG_TO_PAGE_ID[slug] ?? slug;
}

export function buildPublicSelectionPagePath(slug: string): string {
  return `/s/${slug}`;
}

export function buildPublicSelectionPageUrl(slug: string, origin?: string): string {
  const path = buildPublicSelectionPagePath(slug);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  return `${PUBLIC_ENTRY_URL}${path}`;
}

function baseConfigForPage(page: SelectionPageItem): SelectionPagePublicConfig {
  const slug = page.slug;
  return {
    pageId: page.id,
    slug,
    enabled: page.enabled,
    published: page.published,
    sourceId: `${page.id}_v1`,
    header: {
      title: page.botName,
      subtitle: "智能问答 · 参数追问 · 需求提交",
      brandLetter: "K",
    },
    welcome: {
      title: "您好，我可以先回答问题，也可以帮您",
      highlight: "一步步完成选型",
      chips: ["专业解答", "参数追问", "自动整理"],
    },
    productChips: [
      { id: "outdoor", label: "户外机柜" },
      { id: "stainless", label: "不锈钢机柜" },
      { id: "control", label: "控制柜" },
      { id: "ac", label: "机柜空调" },
      { id: "custom", label: "按图定制" },
    ],
    defaultProduct: "户外机柜",
    robot: {
      openingMessage:
        "您好！我是库滋玛 AI 选型助手，您可以告诉我您的使用场景和需求，我为您推荐最合适的机柜方案。",
      recommendedQuestions: [
        "户外机柜可以做 IP65 吗？",
        "推荐一款适合通信基站的机柜",
        "单舱和双舱机柜有什么区别？",
      ],
    },
    demoMessages: [
      {
        id: "u1",
        role: "user",
        content: "户外用机柜可以做 IP65 吗？",
      },
      {
        id: "a1",
        role: "assistant",
        content:
          "可以的，库滋玛户外机柜支持 IP55 / IP65 防护等级，采用密封结构与防水设计，适合户外环境长期使用。",
      },
      {
        id: "a2",
        role: "assistant",
        content: "为更精准推荐方案，请补充以下信息：",
        followUpList: [
          "机柜尺寸（宽×深×高 mm）是多少？",
          "使用环境是户外还是室内？",
          "需要的数量大概是多少？",
          "是否有图纸或参考图片？",
        ],
      },
      {
        id: "u2",
        role: "user",
        content: "1200×600×2000mm，户外，2台，有图纸。",
      },
      {
        id: "a3",
        role: "assistant",
        content: "收到，信息已记录。我将为您整理需求并生成方案。",
      },
    ],
    completeness: {
      percent: 72,
      items: [
        { id: "product", label: "产品类型", value: "户外机柜", done: true },
        { id: "size", label: "尺寸 (mm)", value: "1200×600×2000", done: true },
        { id: "env", label: "使用环境", value: "户外", done: true },
        { id: "qty", label: "数量", value: "2 台", done: true },
        { id: "file", label: "图纸附件", value: "已上传 1 个", done: true },
        { id: "lead", label: "交期要求", value: "待补充", done: false },
      ],
    },
    upload: {
      title: "上传图纸 / 图片",
      hint: "(支持 PDF、CAD、JPG、PNG，单个 ≤20MB)",
      buttonLabel: "继续上传",
      sampleFileName: "户外机柜图纸.pdf",
      sampleFileSize: "1.2MB",
    },
    form: {
      fields: [
        {
          id: "name",
          label: "联系人",
          type: "text",
          required: true,
          placeholder: "请输入联系人",
          span: 1,
        },
        {
          id: "phone",
          label: "手机号",
          type: "tel",
          required: true,
          placeholder: "请输入手机号",
          span: 1,
        },
      ],
      privacyNote: "您的信息仅用于需求沟通与方案报价，严格保密",
    },
    footer: {
      continueLabel: "继续咨询",
      submitLabel: "提交需求",
      submitSub: "工程师审核后将尽快为您提供方案与报价",
    },
    postSubmit: {
      successTitle: "需求提交成功",
      successMessage: "已为您生成报价需求，工程师将在 24 小时内联系您",
    },
  };
}

const DEFAULT_CONFIGS: Record<string, SelectionPagePublicConfig> = Object.fromEntries(
  DEMO_SELECTION_PAGES.map((page) => {
    const config = baseConfigForPage(page);
    if (page.id === "outdoor") {
      config.header.title = "库滋玛 AI 产品选型助手";
      config.welcome.title = "您好，我可以先回答";
      config.welcome.highlight = "问题，也可以帮您一步步完成选型";
    }
    return [config.slug, config];
  }),
);

export function getDefaultSelectionPageConfig(slug: string): SelectionPagePublicConfig | null {
  return DEFAULT_CONFIGS[slug] ?? null;
}

export function listDefaultSelectionPageConfigs(): SelectionPagePublicConfig[] {
  return Object.values(DEFAULT_CONFIGS);
}

export function mergeSelectionPageConfig(
  base: SelectionPagePublicConfig,
  patch: Partial<SelectionPagePublicConfig>,
): SelectionPagePublicConfig {
  return {
    ...base,
    ...patch,
    header: { ...base.header, ...patch.header },
    welcome: { ...base.welcome, ...patch.welcome },
    robot: { ...base.robot, ...patch.robot },
    completeness: { ...base.completeness, ...patch.completeness },
    upload: { ...base.upload, ...patch.upload },
    form: { ...base.form, ...patch.form },
    footer: { ...base.footer, ...patch.footer },
    postSubmit: { ...base.postSubmit, ...patch.postSubmit },
  };
}

export const SELECTION_PAGE_STORAGE_KEY = "qiyun:selection-page-config:";

export function getSelectionPageStorageKey(slug: string): string {
  return `${SELECTION_PAGE_STORAGE_KEY}${slug}`;
}
