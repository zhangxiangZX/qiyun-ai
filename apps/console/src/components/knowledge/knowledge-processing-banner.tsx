"use client";

import { Loader2 } from "lucide-react";

import { Alert } from "@qiyun/ui";

import {
  DOCUMENT_POLL_INTERVAL_SECONDS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_POLLING_NOTE,
} from "@/lib/knowledge/status-labels";
import type { KnowledgeDocument } from "@/lib/knowledge/types";

function countByStatus(documents: KnowledgeDocument[], status: KnowledgeDocument["status"]) {
  return documents.filter((document) => document.status === status).length;
}

export function KnowledgeProcessingBanner({
  documents,
}: {
  documents: KnowledgeDocument[];
}) {
  const uploaded = countByStatus(documents, "uploaded");
  const parsing = countByStatus(documents, "parsing");
  const indexing = countByStatus(documents, "indexing");
  const total = uploaded + parsing + indexing;

  if (!total) {
    return null;
  }

  const stages = [
    uploaded ? `${uploaded} 个${DOCUMENT_STATUS_LABELS.uploaded}` : null,
    parsing ? `${parsing} 个${DOCUMENT_STATUS_LABELS.parsing}` : null,
    indexing ? `${indexing} 个${DOCUMENT_STATUS_LABELS.indexing}` : null,
  ].filter(Boolean);

  return (
    <Alert variant="info" title="文档处理中（状态轮询）">
      <div className="flex items-start gap-2">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        <div className="space-y-1.5 text-sm">
          <p>
            当前有 {total} 个文档正在处理（{stages.join("、")}）。
          </p>
          <p className="text-muted-foreground">
            每 {DOCUMENT_POLL_INTERVAL_SECONDS} 秒查询一次文档状态；全部完成后将变为「
            {DOCUMENT_STATUS_LABELS.ready}」。{DOCUMENT_STATUS_POLLING_NOTE}
          </p>
        </div>
      </div>
    </Alert>
  );
}
