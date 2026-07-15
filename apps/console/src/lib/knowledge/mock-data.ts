import type { KnowledgeBase, KnowledgeDocument } from "./types";

export interface KnowledgeDemoState {
  knowledgeBases: KnowledgeBase[];
  documentsByBase: Record<string, KnowledgeDocument[]>;
  selectedBaseId: string | null;
}

const now = new Date("2026-06-30T09:30:00.000Z");

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export function createKnowledgeDemoState(): KnowledgeDemoState {
  const workspaceId = "ws_demo";
  const knowledgeBases: KnowledgeBase[] = [
    {
      id: "kb-product",
      workspaceId,
      name: "Product Support Docs",
      status: "active",
      documentCount: 4,
      readyDocumentCount: 2,
      failedDocumentCount: 1,
      createdAt: minutesAgo(60 * 24 * 5),
      updatedAt: minutesAgo(3),
    },
    {
      id: "kb-sales",
      workspaceId,
      name: "Sales Enablement",
      status: "active",
      documentCount: 3,
      readyDocumentCount: 2,
      failedDocumentCount: 0,
      createdAt: minutesAgo(60 * 24 * 2),
      updatedAt: minutesAgo(2),
    },
  ];

  const documentsByBase: Record<string, KnowledgeDocument[]> = {
    "kb-product": [
      {
        id: "doc-product-1",
        workspaceId,
        knowledgeBaseId: "kb-product",
        fileName: "pricing-overview.pdf",
        fileType: ".pdf",
        storageKey: `${workspaceId}/kb-product/doc-product-1`,
        sizeBytes: 1_450_000,
        status: "ready",
        chunkCount: 84,
        errorCode: null,
        errorMessage: null,
        createdAt: minutesAgo(22),
        updatedAt: minutesAgo(22),
        deletedAt: null,
      },
      {
        id: "doc-product-2",
        workspaceId,
        knowledgeBaseId: "kb-product",
        fileName: "security-faq.md",
        fileType: ".md",
        storageKey: `${workspaceId}/kb-product/doc-product-2`,
        sizeBytes: 42_000,
        status: "ready",
        chunkCount: 14,
        errorCode: null,
        errorMessage: null,
        createdAt: minutesAgo(40),
        updatedAt: minutesAgo(40),
        deletedAt: null,
      },
      {
        id: "doc-product-3",
        workspaceId,
        knowledgeBaseId: "kb-product",
        fileName: "integration-checklist.docx",
        fileType: ".docx",
        storageKey: `${workspaceId}/kb-product/doc-product-3`,
        sizeBytes: 680_000,
        status: "indexing",
        chunkCount: null,
        errorCode: null,
        errorMessage: null,
        createdAt: minutesAgo(3),
        updatedAt: minutesAgo(3),
        deletedAt: null,
      },
      {
        id: "doc-product-4",
        workspaceId,
        knowledgeBaseId: "kb-product",
        fileName: "legacy-fail-policy.txt",
        fileType: ".txt",
        storageKey: `${workspaceId}/kb-product/doc-product-4`,
        sizeBytes: 12_300,
        status: "failed",
        chunkCount: null,
        errorCode: "parser_unstable_sections",
        errorMessage: "Parser could not extract stable sections from this demo file.",
        createdAt: minutesAgo(8),
        updatedAt: minutesAgo(8),
        deletedAt: null,
      },
    ],
    "kb-sales": [
      {
        id: "doc-sales-1",
        workspaceId,
        knowledgeBaseId: "kb-sales",
        fileName: "lead-qualification-playbook.pdf",
        fileType: ".pdf",
        storageKey: `${workspaceId}/kb-sales/doc-sales-1`,
        sizeBytes: 820_000,
        status: "ready",
        chunkCount: 39,
        errorCode: null,
        errorMessage: null,
        createdAt: minutesAgo(90),
        updatedAt: minutesAgo(90),
        deletedAt: null,
      },
      {
        id: "doc-sales-2",
        workspaceId,
        knowledgeBaseId: "kb-sales",
        fileName: "objection-handling.md",
        fileType: ".md",
        storageKey: `${workspaceId}/kb-sales/doc-sales-2`,
        sizeBytes: 34_800,
        status: "ready",
        chunkCount: 9,
        errorCode: null,
        errorMessage: null,
        createdAt: minutesAgo(145),
        updatedAt: minutesAgo(145),
        deletedAt: null,
      },
      {
        id: "doc-sales-3",
        workspaceId,
        knowledgeBaseId: "kb-sales",
        fileName: "competitor-comparison.txt",
        fileType: ".txt",
        storageKey: `${workspaceId}/kb-sales/doc-sales-3`,
        sizeBytes: 18_900,
        status: "parsing",
        chunkCount: null,
        errorCode: null,
        errorMessage: null,
        createdAt: minutesAgo(2),
        updatedAt: minutesAgo(2),
        deletedAt: null,
      },
    ],
  };

  return {
    knowledgeBases,
    documentsByBase,
    selectedBaseId: knowledgeBases[0]?.id ?? null,
  };
}
