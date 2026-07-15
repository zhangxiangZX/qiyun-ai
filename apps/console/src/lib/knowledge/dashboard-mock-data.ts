export interface KnowledgeCategoryNode {
  id: string;
  name: string;
  count: number;
  children?: KnowledgeCategoryNode[];
}

export interface KnowledgeDocumentRow {
  id: string;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "xlsx" | "txt" | "md" | "html";
  category: string;
  source: string;
  status: "vectorized" | "processing" | "failed" | "pending";
  segments: number | null;
  updatedAt: string;
  linkedAssistant: string;
}

export interface KnowledgeHistoryItem {
  id: string;
  action: string;
  user: string;
  time: string;
}

export interface KnowledgeHitDoc {
  rank: number;
  name: string;
  hits: number;
  hitRate: number;
}

export const knowledgeDashboardStats = {
  totalDocuments: 568,
  totalGrowth: 12.3,
  vectorized: 398,
  vectorizedRate: 70.1,
  pending: 42,
  pendingChange: -6.7,
  recentUpdateAt: "2024-06-01 14:30",
  recentUpdateFile: "《产品手册 v2.3.pdf》",
  avgHitRate: 68.5,
  hitRateChange: 4.6,
};

export const knowledgeCategories: KnowledgeCategoryNode[] = [
  {
    id: "product",
    name: "产品资料",
    count: 128,
    children: [
      { id: "manual", name: "产品手册", count: 56 },
      { id: "feature", name: "功能说明", count: 42 },
      { id: "spec", name: "技术参数", count: 30 },
    ],
  },
  { id: "solution", name: "解决方案", count: 96 },
  { id: "case", name: "客户案例", count: 78 },
  { id: "faq", name: "常见问题", count: 64 },
  { id: "after-sales", name: "售后服务", count: 52 },
  { id: "compliance", name: "合规认证", count: 38 },
  { id: "other", name: "其他资料", count: 112 },
];

export const knowledgeDocumentRows: KnowledgeDocumentRow[] = [
  {
    id: "d1",
    fileName: "智能客服产品手册.pdf",
    fileType: "pdf",
    category: "产品资料 / 产品手册",
    source: "手动上传",
    status: "vectorized",
    segments: 284,
    updatedAt: "2024-06-01 14:30",
    linkedAssistant: "官网智能客服",
  },
  {
    id: "d2",
    fileName: "2024解决方案白皮书.docx",
    fileType: "docx",
    category: "解决方案",
    source: "手动上传",
    status: "vectorized",
    segments: 156,
    updatedAt: "2024-05-31 10:15",
    linkedAssistant: "选型助手小Q",
  },
  {
    id: "d3",
    fileName: "产品功能演示文档.pptx",
    fileType: "pptx",
    category: "产品资料 / 功能说明",
    source: "批量导入",
    status: "processing",
    segments: null,
    updatedAt: "2024-06-01 09:20",
    linkedAssistant: "官网智能客服",
  },
  {
    id: "d4",
    fileName: "客户案例集_制造业.pdf",
    fileType: "pdf",
    category: "客户案例",
    source: "手动上传",
    status: "vectorized",
    segments: 98,
    updatedAt: "2024-05-30 16:40",
    linkedAssistant: "销售外呼助手",
  },
  {
    id: "d5",
    fileName: "技术文档_集成指南.md",
    fileType: "md",
    category: "产品资料 / 技术参数",
    source: "手动上传",
    status: "failed",
    segments: null,
    updatedAt: "2024-05-29 11:05",
    linkedAssistant: "售前技术支持",
  },
  {
    id: "d6",
    fileName: "售后服务FAQ.txt",
    fileType: "txt",
    category: "售后服务",
    source: "手动上传",
    status: "vectorized",
    segments: 42,
    updatedAt: "2024-05-28 17:22",
    linkedAssistant: "官网智能客服",
  },
  {
    id: "d7",
    fileName: "CE认证资料包.pdf",
    fileType: "pdf",
    category: "合规认证",
    source: "批量导入",
    status: "vectorized",
    segments: 67,
    updatedAt: "2024-05-27 09:50",
    linkedAssistant: "选型助手小Q",
  },
  {
    id: "d8",
    fileName: "报价模板说明.xlsx",
    fileType: "xlsx",
    category: "其他资料",
    source: "手动上传",
    status: "pending",
    segments: null,
    updatedAt: "2024-05-26 15:30",
    linkedAssistant: "—",
  },
];

export const knowledgeRecentHistory: KnowledgeHistoryItem[] = [
  { id: "h1", action: "更新了文档《产品手册 v2.3.pdf》", user: "张伟", time: "06-01 14:30" },
  { id: "h2", action: "新增文档《2024解决方案白皮书.docx》", user: "李娜", time: "05-31 10:15" },
  { id: "h3", action: "重新向量化《售后服务FAQ.txt》", user: "王磊", time: "05-30 09:40" },
  { id: "h4", action: "删除文档《过期促销资料.pdf》", user: "陈晨", time: "05-29 16:20" },
  { id: "h5", action: "绑定助手「官网智能客服」", user: "张伟", time: "05-28 11:00" },
];

export const knowledgeTopHits: KnowledgeHitDoc[] = [
  { rank: 1, name: "智能客服产品手册.pdf", hits: 1248, hitRate: 82.4 },
  { rank: 2, name: "2024解决方案白皮书.docx", hits: 986, hitRate: 76.8 },
  { rank: 3, name: "售后服务FAQ.txt", hits: 742, hitRate: 71.2 },
  { rank: 4, name: "客户案例集_制造业.pdf", hits: 618, hitRate: 68.5 },
  { rank: 5, name: "CE认证资料包.pdf", hits: 534, hitRate: 65.3 },
];
