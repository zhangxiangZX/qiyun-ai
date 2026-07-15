import {
  getDefaultSelectionPageConfig,
  getSelectionPageSlug,
  mergeSelectionPageConfig,
  type SelectionPagePublicConfig,
} from "@/lib/channels/ai-selection-page-config";
import type { SelectionPageItem } from "@/lib/channels/ai-standalone-shared";

export interface SelectionPageEditSnapshot {
  page: SelectionPageItem;
  pageName: string;
  published: boolean;
  defaultProduct: string;
  description: string;
  boundBot: string;
  openingMessage: string;
  questions: string[];
  successTitle: string;
  successMessage: string;
  sourceId?: string;
}

export function buildSelectionPageConfigFromEdit(
  snapshot: SelectionPageEditSnapshot,
): SelectionPagePublicConfig {
  const slug = getSelectionPageSlug(snapshot.page.id);
  const base =
    getDefaultSelectionPageConfig(slug) ??
    ({
      pageId: snapshot.page.id,
      slug,
      enabled: snapshot.page.enabled,
      published: snapshot.published,
      sourceId: snapshot.sourceId ?? `${snapshot.page.id}_v1`,
      header: {
        title: snapshot.boundBot,
        subtitle: "智能问答 · 参数追问 · 需求提交",
        brandLetter: "K",
      },
      welcome: {
        title: "您好，我可以先回答问题，也可以帮您",
        highlight: "一步步完成选型",
        chips: ["专业解答", "参数追问", "自动整理"],
      },
      productChips: [],
      defaultProduct: snapshot.defaultProduct,
      robot: { openingMessage: snapshot.openingMessage, recommendedQuestions: [] },
      demoMessages: [],
      completeness: { percent: 0, items: [] },
      upload: {
        title: "上传图纸 / 图片",
        hint: "",
        buttonLabel: "继续上传",
        sampleFileName: "",
        sampleFileSize: "",
      },
      form: { fields: [], privacyNote: "" },
      footer: {
        continueLabel: "继续咨询",
        submitLabel: "提交需求",
        submitSub: "工程师审核后将尽快为您提供方案与报价",
      },
      postSubmit: {
        successTitle: snapshot.successTitle,
        successMessage: snapshot.successMessage,
      },
    } satisfies SelectionPagePublicConfig);

  return mergeSelectionPageConfig(base, {
    published: snapshot.published,
    enabled: snapshot.page.enabled,
    sourceId: snapshot.sourceId ?? base.sourceId,
    header: {
      ...base.header,
      title: snapshot.boundBot || snapshot.pageName,
    },
    welcome: {
      ...base.welcome,
      title: snapshot.description
        ? snapshot.description.slice(0, 24)
        : base.welcome.title,
    },
    defaultProduct: snapshot.defaultProduct.split("（")[0] || snapshot.defaultProduct,
    robot: {
      openingMessage: snapshot.openingMessage,
      recommendedQuestions: snapshot.questions.map((text) => text).filter(Boolean),
    },
    postSubmit: {
      successTitle: snapshot.successTitle,
      successMessage: snapshot.successMessage,
    },
  });
}
