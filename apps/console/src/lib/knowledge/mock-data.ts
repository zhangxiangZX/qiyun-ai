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
  const knowledgeBases: KnowledgeBase[] = [
    {
      id: "kb-product",
      name: "Product Support Docs",
      status: "active",
      createdAt: minutesAgo(60 * 24 * 5),
      updatedAt: minutesAgo(3),
      documentCount: 4,
      readyDocumentCount: 2,
      failedDocumentCount: 1,
    },
    {
      id: "kb-sales",
      name: "Sales Enablement",
      status: "active",
      createdAt: minutesAgo(60 * 24 * 2),
      updatedAt: minutesAgo(2),
      documentCount: 3,
      readyDocumentCount: 2,
      failedDocumentCount: 0,
    },
  ];

  const documentsByBase: Record<string, KnowledgeDocument[]> = {
    "kb-product": [
      {
        id: "doc-product-1",
        knowledgeBaseId: "kb-product",
        fileName: "pricing-overview.pdf",
        fileType: ".pdf",
        sizeBytes: 1_450_000,
        status: "ready",
        chunkCount: 84,
        errorMessage: null,
        updatedAt: minutesAgo(22),
      },
      {
        id: "doc-product-2",
        knowledgeBaseId: "kb-product",
        fileName: "security-faq.md",
        fileType: ".md",
        sizeBytes: 42_000,
        status: "ready",
        chunkCount: 14,
        errorMessage: null,
        updatedAt: minutesAgo(40),
      },
      {
        id: "doc-product-3",
        knowledgeBaseId: "kb-product",
        fileName: "integration-checklist.docx",
        fileType: ".docx",
        sizeBytes: 680_000,
        status: "indexing",
        chunkCount: null,
        errorMessage: null,
        updatedAt: minutesAgo(3),
      },
      {
        id: "doc-product-4",
        knowledgeBaseId: "kb-product",
        fileName: "legacy-fail-policy.txt",
        fileType: ".txt",
        sizeBytes: 12_300,
        status: "failed",
        chunkCount: null,
        errorMessage: "Parser could not extract stable sections from this demo file.",
        updatedAt: minutesAgo(8),
      },
    ],
    "kb-sales": [
      {
        id: "doc-sales-1",
        knowledgeBaseId: "kb-sales",
        fileName: "lead-qualification-playbook.pdf",
        fileType: ".pdf",
        sizeBytes: 820_000,
        status: "ready",
        chunkCount: 39,
        errorMessage: null,
        updatedAt: minutesAgo(90),
      },
      {
        id: "doc-sales-2",
        knowledgeBaseId: "kb-sales",
        fileName: "objection-handling.md",
        fileType: ".md",
        sizeBytes: 34_800,
        status: "ready",
        chunkCount: 9,
        errorMessage: null,
        updatedAt: minutesAgo(145),
      },
      {
        id: "doc-sales-3",
        knowledgeBaseId: "kb-sales",
        fileName: "competitor-comparison.txt",
        fileType: ".txt",
        sizeBytes: 18_900,
        status: "parsing",
        chunkCount: null,
        errorMessage: null,
        updatedAt: minutesAgo(2),
      },
    ],
  };

  return {
    knowledgeBases,
    documentsByBase,
    selectedBaseId: knowledgeBases[0]?.id ?? null,
  };
}
