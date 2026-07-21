// 本地 mock 数据：AI 对话测试沙盒（企业 AI 助手对话测试）
//
// 仅用于「预览模式」或后端未配置时回退，不接管任何真实后端逻辑。
// 配合 useApiResource("/bots", AI_TEST_BOTS) 使用：上游未就绪时展示本数据。

export type AiTestBotStatus = "enabled" | "disabled" | "draft";

export interface AiTestBot {
  id: string;
  name: string;
  status: AiTestBotStatus;
  /** 头像展示字符（emoji） */
  avatar: string;
  /** 头像背景 tailwind 类 */
  avatarClass: string;
  description: string;
  /** 模型名称（用于调试信息面板展示） */
  model: string;
  welcomeMessage: string;
}

export interface AiTestDebugInfo {
  /** 上一次回复消耗的 token 数 */
  tokens: number;
  /** 上一次回复耗时（毫秒） */
  latencyMs: number;
  /** 命中知识库片段数 */
  kbHits: number;
  /** 模型名称 */
  model: string;
}

export type AiTestOutcome =
  | "knowledge_hit"
  | "low_score"
  | "no_knowledge"
  | "needs_lead"
  | "empty_kb"
  | "service_error";

export interface AiTestCitation {
  id: string;
  title: string;
  excerpt: string;
  score?: number;
}

export interface AiTestMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  /** 助手回复的业务结果分类（欢迎语等可省略） */
  outcome?: AiTestOutcome;
  citations?: AiTestCitation[];
  /** 仅助手消息携带诊断信息 */
  debug?: AiTestDebugInfo;
}

const LEAD_KEYWORDS = /报价|价格|多少钱|费用|预算|采购.*台|批量|交期.*确认|定制/;
const LOW_SCORE_THRESHOLD = 0.6;

export function inferAiTestOutcome(
  question: string,
  citations: Array<{ score?: number }> = [],
  options?: { emptyKnowledgeBase?: boolean; serviceError?: boolean },
): AiTestOutcome {
  if (options?.serviceError) return "service_error";
  if (options?.emptyKnowledgeBase) return "empty_kb";
  if (LEAD_KEYWORDS.test(question)) {
    return "needs_lead";
  }
  if (citations.length > 0) {
    const scores = citations
      .map((item) => item.score)
      .filter((score): score is number => typeof score === "number");
    if (scores.length > 0 && scores.every((score) => score < LOW_SCORE_THRESHOLD)) {
      return "low_score";
    }
    return "knowledge_hit";
  }
  return "no_knowledge";
}

export const AI_TEST_BOTS: AiTestBot[] = [
  {
    id: "bot-cnc",
    name: "精密数控机床助手",
    status: "enabled",
    avatar: "⚙️",
    avatarClass: "bg-primary/10 text-primary",
    description: "面向机床采购与选型的售前技术问答助手",
    model: "qiyun-cnc-pro-12b",
    welcomeMessage:
      "您好，我是精密数控机床助手。您可以问我关于加工精度、主轴参数、机型选型或打样的问题。",
  },
  {
    id: "bot-quote",
    name: "工业报价顾问",
    status: "enabled",
    avatar: "📊",
    avatarClass: "bg-info/10 text-info",
    description: "根据配置与批量自动生成报价区间与交期",
    model: "qiyun-sales-7b",
    welcomeMessage:
      "您好，我是工业报价顾问。告诉我型号、配置和采购数量，我为您估算报价区间。",
  },
  {
    id: "bot-service",
    name: "售后技术支持",
    status: "enabled",
    avatar: "🔧",
    avatarClass: "bg-success/10 text-success",
    description: "故障报警排查、诊断与工单登记",
    model: "qiyun-support-7b",
    welcomeMessage:
      "您好，我是售后技术支持。遇到报警代码或设备异常，描述一下现象，我帮您排查。",
  },
  {
    id: "bot-internal",
    name: "内部知识助手",
    status: "disabled",
    avatar: "📚",
    avatarClass: "bg-muted text-muted-foreground",
    description: "内部文档与合规知识检索（测试环境）",
    model: "qiyun-internal-70b",
    welcomeMessage:
      "您好，我是内部知识助手（当前为停用状态，仅用于测试）。可检索合规与内部文档。",
  },
];

function formatTime(date = new Date()): string {
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

interface SeedConversation {
  user: string;
  assistant: string;
  debug: AiTestDebugInfo;
}

const SEED_CONVERSATIONS: Record<string, SeedConversation> = {
  "bot-cnc": {
    user: "你们的数控机床精度多少？",
    assistant:
      "我们的精密数控机床定位精度可达 ±0.005mm，重复定位精度 ±0.003mm，采用高刚性铸铁床身与进口直线导轨，配合全闭环光栅尺反馈，保证长时间加工的稳定性。主轴最高转速 12000rpm，支持五轴联动，适用于模具、航空航天及精密零件加工。如需具体型号参数或申请打样，我可以帮您对接工程师。",
    debug: { tokens: 146, latencyMs: 860, kbHits: 3, model: "qiyun-cnc-pro-12b" },
  },
  "bot-quote": {
    user: "采购 10 台立式加工中心大概多少钱？",
    assistant:
      "以 VMC-850 标准款为例，单台含税价约 ¥18.8 万；10 台批量可享 9 折并免运费。若选配刀库、第四轴或定制夹具会按需加价。建议先确认加工件尺寸与精度要求，我再为您生成正式报价单。",
    debug: { tokens: 132, latencyMs: 910, kbHits: 2, model: "qiyun-sales-7b" },
  },
  "bot-service": {
    user: "机床报警 700036 怎么处理？",
    assistant:
      "报警 700036 通常表示 Z 轴伺服过载。请按以下排查：1）检查 Z 轴导轨润滑是否充足；2）确认加工负载是否超过额定扭矩；3）重启驱动器并复位参数。若仍频繁报警，可能是伺服电机或编码器故障，建议联系售后上门检测。需要我帮您登记工单吗？",
    debug: { tokens: 158, latencyMs: 1040, kbHits: 4, model: "qiyun-support-7b" },
  },
  "bot-internal": {
    user: "ISO 9001 相关文档在哪里？",
    assistant:
      "内部知识库中 ISO 9001 相关文档位于「合规管理 / 质量体系」目录，共 6 份，最近更新于 2026-05-12。需要我摘录关键条款，还是把文档链接发给您？",
    debug: { tokens: 118, latencyMs: 770, kbHits: 3, model: "qiyun-internal-70b" },
  },
};

/** 切换助手时展示的示例对话（欢迎语 + 一轮问答）。 */
export function getAiTestInitialMessages(botId: string): AiTestMessage[] {
  const bot = AI_TEST_BOTS.find((b) => b.id === botId);
  if (!bot) return [];

  const seed = SEED_CONVERSATIONS[botId];
  const messages: AiTestMessage[] = [
    {
      id: `seed-welcome-${bot.id}`,
      role: "assistant",
      content: bot.welcomeMessage,
      time: formatTime(),
    },
  ];

  if (seed) {
    messages.push({
      id: `seed-user-${bot.id}`,
      role: "user",
      content: seed.user,
      time: formatTime(),
    });
    messages.push({
      id: `seed-assistant-${bot.id}`,
      role: "assistant",
      content: seed.assistant,
      time: formatTime(),
      outcome: inferAiTestOutcome(
        seed.user,
        seed.debug.kbHits > 0 ? [{ score: 0.85 }] : [],
      ),
      debug: { ...seed.debug, model: bot.model },
    });
  }

  return messages;
}

function buildReplyContent(bot: AiTestBot, question: string): string {
  switch (bot.id) {
    case "bot-cnc":
      return `关于「${question}」，我们的精密数控机床采用高刚性结构与全闭环反馈，定位精度 ±0.005mm、重复定位精度 ±0.003mm。如需具体型号参数或打样安排，我可以帮您对接技术工程师。`;
    case "bot-quote":
      return `关于「${question}」，报价取决于型号、配置与交付数量。建议您补充加工件尺寸、精度要求与采购台数，我将为您生成正式报价区间与交期。`;
    case "bot-service":
      return `关于「${question}」，建议先核对报警代码与故障现象，并按润滑、负载、参数复位顺序排查；若仍异常，可为您登记售后工单安排工程师上门。`;
    case "bot-internal":
      return `已检索内部知识库，针对「${question}」为您汇总了相关文档要点（预览环境，未连接真实检索服务）。正式上线后可返回完整出处与权限范围内的原文链接。`;
    default:
      return `收到您的问题「${question}」。我是${bot.name}，已为您检索相关知识库并生成回复草稿（预览环境，未连接真实模型）。发布前可在此校验话术与命中知识。`;
  }
}

/** 发送测试问题时生成的 mock 助手回复（含调试信息）。 */
export function getAiTestMockReply(botId: string, question: string): AiTestMessage {
  const bot = AI_TEST_BOTS.find((b) => b.id === botId);
  const safeBot: AiTestBot = bot ?? AI_TEST_BOTS[0];
  const content = buildReplyContent(safeBot, question);
  const tokens = Math.max(40, Math.round(content.length * 0.62));
  const latencyMs = 650 + (content.length % 500);
  const kbHits = Math.min(4, 1 + (question.length % 4));

  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content,
    time: formatTime(),
    outcome: inferAiTestOutcome(
      question,
      kbHits > 0 ? Array.from({ length: kbHits }, () => ({ score: 0.82 })) : [],
    ),
    debug: { tokens, latencyMs, kbHits, model: safeBot.model },
  };
}

export { formatTime };
