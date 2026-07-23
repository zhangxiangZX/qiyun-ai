import type { SelectionPagePublicConfig } from "@/lib/channels/ai-selection-page-config";

export interface ApiSelectionPagePublicPayload {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: "draft" | "published" | "disabled" | string;
  config?: {
    questions?: Array<{
      id: string;
      label: string;
      type?: string;
      required?: boolean;
      options?: string[];
    }>;
    theme?: { primaryColor?: string };
    botId?: string;
    siteKey?: string;
    publicConfig?: SelectionPagePublicConfig;
  };
}

/** Map upstream selection page record into the public visitor UI config. */
export function mapApiSelectionPageToPublicConfig(
  page: ApiSelectionPagePublicPayload,
): SelectionPagePublicConfig {
  const published = page.status === "published";
  const enabled = page.status !== "disabled";
  const questions = page.config?.questions ?? [];
  const recommended = questions.map((question) => question.label).filter(Boolean).slice(0, 6);
  const brandLetter = (page.name.trim().charAt(0) || "A").toUpperCase();

  if (page.config?.publicConfig) {
    return {
      ...page.config.publicConfig,
      pageId: page.id,
      slug: page.slug,
      enabled,
      published,
      botId: page.config.botId?.trim() || page.config.publicConfig.botId,
      siteKey: page.config.siteKey?.trim() || page.config.publicConfig.siteKey,
    };
  }

  return {
    pageId: page.id,
    slug: page.slug,
    enabled,
    published,
    sourceId: `selection:${page.slug}`,
    botId: page.config?.botId?.trim() || undefined,
    siteKey: page.config?.siteKey?.trim() || undefined,
    header: {
      title: page.name,
      subtitle: "智能问答 · 参数追问 · 需求提交",
      brandLetter,
    },
    welcome: {
      title: page.description?.trim().slice(0, 40) || "您好，我可以先回答问题，也可以帮您",
      highlight: "一步步完成选型",
      chips: ["专业解答", "参数追问", "自动整理"],
    },
    productChips: [],
    defaultProduct: "",
    robot: {
      openingMessage:
        page.description?.trim() ||
        `您好！欢迎使用「${page.name}」，请告诉我您的使用场景和需求，我来帮您完成选型。`,
      recommendedQuestions:
        recommended.length > 0
          ? recommended
          : ["请介绍一下产品规格", "交期大概多久？", "如何获取报价？"],
    },
    demoMessages: [],
    completeness: { percent: 0, items: [] },
    upload: {
      title: "上传图纸 / 图片",
      hint: "支持 PDF、JPG、PNG",
      buttonLabel: "继续上传",
      sampleFileName: "",
      sampleFileSize: "",
    },
    form: {
      fields: [
        {
          id: "name",
          label: "联系人",
          type: "text",
          required: true,
          placeholder: "您的姓名",
          span: 1,
        },
        {
          id: "phone",
          label: "手机号",
          type: "tel",
          required: true,
          placeholder: "便于工程师联系",
          span: 1,
        },
        {
          id: "company",
          label: "公司名称",
          type: "text",
          required: false,
          placeholder: "选填",
          span: 2,
        },
        {
          id: "need",
          label: "需求说明",
          type: "textarea",
          required: false,
          placeholder: "补充使用场景或参数",
          span: 2,
        },
      ],
      privacyNote: "提交即表示同意我们联系您跟进选型需求。",
    },
    footer: {
      continueLabel: "继续咨询",
      submitLabel: "提交需求",
      submitSub: "工程师审核后将尽快为您提供方案与报价",
    },
    postSubmit: {
      successTitle: "提交成功",
      successMessage: "我们已收到您的需求，销售将尽快与您联系。",
    },
  };
}
