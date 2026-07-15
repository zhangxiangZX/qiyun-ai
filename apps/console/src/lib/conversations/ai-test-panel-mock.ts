export const AI_TEST_KNOWLEDGE_BASES = [
  { id: "kb-industrial", name: "工业设备知识库 v2.1" },
  { id: "kb-faq", name: "产品 FAQ 知识库" },
  { id: "kb-selection", name: "选型规则知识库" },
];

export const AI_TEST_CONFIG = {
  model: "Qiyun-4.0 Turbo",
  temperature: 0.3,
  topP: 0.9,
  maxToken: 1024,
  rounds: 4,
  startedAt: "2024-06-01 10:30:21",
};

export const AI_TEST_KB_SNIPPETS = [
  {
    id: "s1",
    score: 0.92,
    text: "PE600×900 颚式破碎机最大进料粒度 500mm，处理能力 50-180 t/h。",
    source: "PE600×900 技术手册 P.12",
    tone: "high" as const,
  },
  {
    id: "s2",
    score: 0.86,
    text: "设备标配 PLC 控制系统，支持 Modbus RTU / TCP 通讯协议。",
    source: "工控集成指南 P.8",
    tone: "high" as const,
  },
  {
    id: "s3",
    score: 0.78,
    text: "常规交付周期 30-45 个工作日，定制项目需另行评估。",
    source: "交付条款说明 P.3",
    tone: "mid" as const,
  },
];

export const AI_TEST_INTENT = {
  primary: "产品选型咨询",
  primaryScore: 0.91,
  secondary: "参数询问",
  secondaryScore: 0.84,
};

export const AI_TEST_SOURCES = [
  { name: "PE600×900 技术手册.pdf", score: 0.92 },
  { name: "工控集成指南.docx", score: 0.86 },
  { name: "交付条款说明.pdf", score: 0.78 },
];

export const AI_TEST_QUALITY = {
  overall: 4.2,
  accuracy: 4.5,
  completeness: 4.0,
  relevance: 4.3,
  usability: 4.1,
};
