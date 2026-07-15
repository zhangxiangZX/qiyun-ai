"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, Button, Sheet, SheetContent } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { listDocumentChunks } from "@/lib/knowledge/api";
import type { KnowledgeDocumentChunk } from "@/lib/knowledge/types";

export interface DocumentChunksPanelProps {
  documentId: string | null;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentChunksPanel({
  documentId,
  fileName,
  open,
  onOpenChange,
}: DocumentChunksPanelProps) {
  const [chunks, setChunks] = useState<KnowledgeDocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadChunks = useCallback(async () => {
    if (!documentId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listDocumentChunks(documentId);
      setChunks(data);
    } catch (nextError) {
      setError(nextError);
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open && documentId) {
      void loadChunks();
    }
  }, [documentId, loadChunks, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[min(100vw,32rem)] flex-col gap-0 p-0">
        <div className="border-b border-border px-4 py-4 text-left">
          <h2 className="text-base font-semibold">切分块预览</h2>
          <p className="text-sm text-muted-foreground">{fileName}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              正在加载切分块…
            </div>
          ) : null}

          {!loading && error ? (
            <div className="space-y-3">
              <ConsoleRequestError
                {...resolveRequestErrorPresentation(error, "无法加载切分块。")}
                onRetry={() => void loadChunks()}
              />
            </div>
          ) : null}

          {!loading && !error && chunks.length === 0 ? (
            <Alert variant="info">暂无切分块，请确认文档已完成索引。</Alert>
          ) : null}

          {!loading && !error && chunks.length > 0 ? (
            <ol className="space-y-3">
              {chunks.map((chunk) => (
                <li
                  key={chunk.id}
                  className="rounded-card border border-border bg-card p-3 shadow-card"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>块 #{typeof chunk.chunkIndex === "number" ? chunk.chunkIndex + 1 : "—"}</span>
                    {chunk.sectionTitle ? (
                      <span className="rounded-full bg-muted px-2 py-0.5">{chunk.sectionTitle}</span>
                    ) : null}
                    <span>约 {chunk.tokenEstimate} tokens</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {chunk.content}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
