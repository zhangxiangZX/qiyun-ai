import type { RagCitation } from "../rag/rag.types";

export type ConsultationIntent =
  | "selection"
  | "parameters"
  | "quote"
  | "delivery"
  | "customization"
  | "general";

export type ProductLine =
  | "temperature-control"
  | "cabinet"
  | "console"
  | "suspension"
  | "accessory"
  | "general";

const INTENT_KEYWORDS: Array<{ intent: ConsultationIntent; keywords: string[] }> = [
  { intent: "quote", keywords: ["报价", "价格", "多少钱", "询价", "预算", "成本"] },
  { intent: "delivery", keywords: ["交期", "货期", "多久", "发货", "交付", "周期"] },
  { intent: "customization", keywords: ["定制", "非标", "改造", "开孔", "加装", "特殊", "图纸"] },
  { intent: "parameters", keywords: ["参数", "规格", "尺寸", "材质", "防护等级", "功率"] },
  { intent: "selection", keywords: ["选型", "怎么选", "推荐型号", "适合", "匹配", "方案"] },
];

const PRODUCT_KEYWORDS: Array<{ productLine: ProductLine; keywords: string[] }> = [
  {
    productLine: "temperature-control",
    keywords: ["温控", "空调", "制冷", "散热", "热交换", "冷却", "机柜空调"],
  },
  {
    productLine: "cabinet",
    keywords: ["机柜", "电控柜", "控制柜", "柜体", "配电柜", "机箱", "户外柜"],
  },
  {
    productLine: "console",
    keywords: ["操作台", "控制台", "监控台", "中控台"],
  },
  {
    productLine: "suspension",
    keywords: ["悬臂", "吊臂", "支臂", "悬挂系统"],
  },
  {
    productLine: "accessory",
    keywords: ["附件", "风扇", "过滤", "插座", "锁具", "照明"],
  },
];

const GENERAL_COMPANY_KEYWORDS = ["做什么产品", "主要产品", "产品有哪些", "产品系列", "主营产品", "你们做什么"];

const INTENT_TEMPLATES: Record<ConsultationIntent, string[]> = {
  selection: [
    "你的使用场景和安装环境是什么？",
    "目前更关注尺寸、散热能力，还是安装方式？",
    "如果方便，我可以先按你的应用场景帮你缩小型号范围。",
  ],
  parameters: [
    "你最想确认的是哪些参数，例如尺寸、材质、防护等级或功率？",
    "是否有现成图纸、铭牌或当前型号可供对照？",
    "如果你告诉我应用环境，我可以顺带帮你排除不适合的规格。",
  ],
  quote: [
    "这次是单台询价，还是项目批量报价？",
    "方便先告诉我数量、尺寸或配置差异吗？这会直接影响报价。",
    "如果要尽快出方案，我可以继续帮你确认报价所缺的关键参数。",
  ],
  delivery: [
    "你现在确认的是标准品交期，还是带定制项的项目交期？",
    "预计数量、是否已有图纸、期望到货时间方便一起告诉我吗？",
    "如果你愿意，我可以顺带帮你判断要不要先走选型或报价确认。",
  ],
  customization: [
    "这次主要是改尺寸、开孔、材质，还是内部安装结构？",
    "你现在手里有图纸、草图，还是参考型号？",
    "如果告诉我应用场景和数量，我可以先帮你判断定制难点。",
  ],
  general: [
    "你现在更想了解产品参数、选型建议，还是报价交期？",
    "如果提供产品系列、使用场景或尺寸要求，我可以回答得更准确。",
    "也可以直接告诉我你当前最急着确认的一件事。",
  ],
};

const PRODUCT_TEMPLATES: Record<ProductLine, Partial<Record<ConsultationIntent, string[]>>> = {
  "temperature-control": {
    selection: [
      "设备发热量、柜体尺寸和环境温度大概是多少？",
      "是室内机柜、户外机柜，还是高粉尘或高湿环境？",
      "你更倾向机柜空调、热交换器还是风扇过滤方案？",
    ],
    parameters: [
      "想先确认制冷量、安装尺寸，还是电源规格？",
      "现场最高环境温度和目标柜内温度大概是多少？",
      "是否有现用温控设备型号可以对比？",
    ],
    quote: [
      "请问需要报价的温控方案是标准机型还是带特殊环境要求？",
      "大概台数、安装方式和电源规格方便一起说明吗？",
      "如果有柜体尺寸，我可以先帮你判断报价所需配置。",
    ],
  },
  cabinet: {
    selection: [
      "机柜是落地式还是壁挂式，尺寸范围大概是多少？",
      "需要关注防护等级、承重还是走线布局？",
      "你是用于电控、通讯，还是工厂现场设备配套？",
    ],
    parameters: [
      "想确认柜体尺寸、材质厚度，还是防护等级？",
      "是否需要开孔、观察窗或特殊安装板？",
      "如果有内部元件布局，我可以帮你判断空间是否够用。",
    ],
  },
  console: {
    selection: [
      "操作台是单人位、多联位，还是监控中心场景？",
      "你更关注台面尺寸、布线能力，还是人体工学？",
      "是否需要预留显示器、键盘或设备安装位？",
    ],
  },
  suspension: {
    selection: [
      "悬臂是承载显示器、控制盒，还是整套操作终端？",
      "需要多大承重和活动半径？",
      "现场安装位置是墙装、顶装还是设备侧装？",
    ],
  },
  accessory: {
    general: [
      "你要确认的是附件兼容性、规格，还是供货周期？",
      "如果告诉我配套设备型号，我可以帮你判断是否适配。",
      "也可以直接发我你现在缺的那一类附件。",
    ],
  },
  general: {},
};

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function detectConsultationIntent(query: string): ConsultationIntent {
  const normalized = normalizeText(query);
  for (const entry of INTENT_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.intent;
    }
  }
  return "general";
}

export function inferProductLine(input: {
  query: string;
  citations?: RagCitation[];
}): ProductLine {
  const source = [
    input.query,
    ...(input.citations ?? []).flatMap((item) => [item.title ?? "", item.snippet ?? ""]),
  ]
    .join(" ")
    .toLowerCase();

  for (const entry of PRODUCT_KEYWORDS) {
    if (entry.keywords.some((keyword) => source.includes(keyword))) {
      return entry.productLine;
    }
  }
  return "general";
}

export function buildRetrievalQuery(query: string): string {
  const normalized = normalizeText(query);
  const intent = detectConsultationIntent(query);
  const expanded = [query.trim()];

  if (GENERAL_COMPANY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    expanded.push("产品系列 机柜 机箱 操作台 悬臂 温控 附件 公司与服务能力");
  }

  switch (intent) {
    case "quote":
      expanded.push("报价 价格 数量 配置 尺寸 使用环境 交期");
      break;
    case "delivery":
      expanded.push("交期 发货 周期 标准机柜 非标机柜 数量 图纸");
      break;
    case "customization":
      expanded.push("非标定制 图纸 开孔 尺寸 材质 安装板 结构调整");
      break;
    case "selection":
      expanded.push("选型 使用场景 尺寸 环境 参数 型号");
      break;
    case "parameters":
      expanded.push("参数 规格 尺寸 材质 防护等级 功率");
      break;
    default:
      break;
  }

  return dedupe(expanded).join(" ");
}

export function buildLeadCaptureCoaching(input: {
  intent: ConsultationIntent;
  productLine: ProductLine;
  missingFields?: string[];
}): string {
  const missing = (input.missingFields ?? []).filter(Boolean).slice(0, 4).join("、");
  if (input.intent === "quote") {
    return missing
      ? `如果你准备进入报价阶段，建议优先补充 ${missing}，这样工程师能更快整理方案和报价。`
      : "如果你准备进入报价阶段，我建议一起确认数量、尺寸、材质或配置差异、交付地区，以及是否有图纸，这样工程师能更快出方案。";
  }
  if (input.intent === "delivery") {
    return missing
      ? `如果你着急确认交期，建议优先补充 ${missing}，这样更容易判断能否快速排期。`
      : "如果你着急确认交期，建议一并提供数量、标准品还是非标、是否已有图纸以及期望到货时间，这样更容易快速排期。";
  }
  if (input.intent === "customization") {
    return missing
      ? `如果是非标定制，最好同步 ${missing}，工程师才能更准确评估可行性与报价。`
      : "如果是非标定制，最好同步图纸、开孔要求、尺寸、公差和使用环境，工程师才能更准确评估可行性与报价。";
  }
  if (input.productLine === "temperature-control") {
    return "温控类方案通常还要确认发热量、柜体尺寸和环境温度，确认后我可以继续帮你缩小型号范围。";
  }
  return "如果你愿意，我可以继续帮你把需求拆成产品类型、尺寸、环境和数量这几个关键项，方便更快进入选型或报价。";
}

export function buildSuggestedQuestions(input: {
  query: string;
  citations?: RagCitation[];
  needsLeadCapture?: boolean;
  intent?: ConsultationIntent;
  productLine?: ProductLine;
}): string[] {
  const intent = input.intent ?? detectConsultationIntent(input.query);
  const productLine = input.productLine ?? inferProductLine(input);
  const productSpecific =
    PRODUCT_TEMPLATES[productLine][intent] ?? PRODUCT_TEMPLATES[productLine].general ?? [];
  const intentSpecific = INTENT_TEMPLATES[intent];

  const combined = dedupe([...productSpecific, ...intentSpecific]);
  const sliced = combined.slice(0, 3);

  if (sliced.length > 0) {
    return sliced;
  }

  if (input.needsLeadCapture) {
    return [
      "你可以先告诉我产品系列、使用场景或尺寸要求。",
      "如果需要报价，请补充数量、配置和交付地区。",
      "如果方便，也可以直接留下联系方式让工程师跟进。",
    ];
  }

  return INTENT_TEMPLATES.general.slice(0, 3);
}
