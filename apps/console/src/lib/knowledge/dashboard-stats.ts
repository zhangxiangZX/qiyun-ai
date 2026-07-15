import type { KnowledgeDocument } from "@/lib/knowledge/types";
import type { KnowledgeCategoryNode, KnowledgeDocumentRow } from "@/lib/knowledge/dashboard-mock-data";

export function buildKnowledgeStats(documents: KnowledgeDocumentRow[]) {
  const total = documents.length;
  const vectorized = documents.filter((doc) => doc.status === "vectorized").length;
  const pending = documents.filter((doc) => doc.status === "pending" || doc.status === "processing").length;
  const latest = documents
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  return {
    totalDocuments: total,
    totalGrowth: 0,
    vectorized,
    vectorizedRate: total > 0 ? Math.round((vectorized / total) * 1000) / 10 : 0,
    pending,
    pendingChange: 0,
    recentUpdateAt: latest?.updatedAt ?? "—",
    recentUpdateFile: latest?.fileName ?? "—",
    avgHitRate: vectorized > 0 ? Math.round((vectorized / Math.max(total, 1)) * 1000) / 10 : 0,
    hitRateChange: 0,
  };
}

export function buildKnowledgeCategories(documents: KnowledgeDocumentRow[]): KnowledgeCategoryNode[] {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    const key = doc.category || "未分类";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const nodes = [...counts.entries()].map(([name, count], index) => ({
    id: `cat-${index}`,
    name,
    count,
  }));
  return nodes.length
    ? [{ id: "all", name: "全部资料", count: documents.length }, ...nodes]
    : [{ id: "all", name: "全部资料", count: 0 }];
}

export function mapApiDocumentToRow(doc: KnowledgeDocument, index: number, category = "产品资料") {
  const ext = doc.fileType.replace(".", "").toLowerCase();
  const fileType = (["pdf", "docx", "pptx", "xlsx", "txt", "md", "html"].includes(ext)
    ? ext
    : "pdf") as KnowledgeDocumentRow["fileType"];
  const status =
    doc.status === "ready"
      ? "vectorized"
      : doc.status === "failed"
        ? "failed"
        : doc.status === "uploaded"
          ? "pending"
          : "processing";

  return {
    id: doc.id,
    fileName: doc.fileName,
    fileType,
    category,
    source: "手动上传",
    status,
    segments: doc.chunkCount,
    updatedAt: new Date(doc.updatedAt).toLocaleString("zh-CN"),
    linkedAssistant: index % 2 === 0 ? "官网智能客服" : "—",
  } satisfies KnowledgeDocumentRow;
}
