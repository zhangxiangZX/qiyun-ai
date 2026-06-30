"use client";

import { useCallback, useMemo, useState } from "react";
import { BookOpenText, FolderPlus, Plus } from "lucide-react";

import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import { CreateKnowledgeBaseDialog } from "@/components/knowledge/create-knowledge-base-dialog";
import { DocumentList } from "@/components/knowledge/document-list";
import { UploadZone } from "@/components/knowledge/upload-zone";
import { getFileExtension } from "@/lib/knowledge/format";
import {
  createDocumentId,
  createKnowledgeBaseId,
} from "@/lib/knowledge/validation";
import type { KnowledgeBase, KnowledgeDocument } from "@/lib/knowledge/types";

function estimateChunkCount(sizeBytes: number): number {
  return Math.max(1, Math.round(sizeBytes / 2048));
}

export function KnowledgeBaseWorkspace() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [documentsByBase, setDocumentsByBase] = useState<Record<string, KnowledgeDocument[]>>({});
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingBase, setCreatingBase] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const selectedBase = useMemo(
    () => knowledgeBases.find((item) => item.id === selectedBaseId) ?? null,
    [knowledgeBases, selectedBaseId],
  );

  const documents = selectedBaseId ? documentsByBase[selectedBaseId] ?? [] : [];

  const scheduleStatusProgress = useCallback((baseId: string, documentId: string, sizeBytes: number) => {
    const updates: Array<{ status: KnowledgeDocument["status"]; delay: number; chunkCount?: number }> = [
      { status: "parsing", delay: 800 },
      { status: "indexing", delay: 2000 },
      { status: "ready", delay: 3400, chunkCount: estimateChunkCount(sizeBytes) },
    ];

    for (const update of updates) {
      window.setTimeout(() => {
        setDocumentsByBase((current) => ({
          ...current,
          [baseId]: (current[baseId] ?? []).map((item) =>
            item.id === documentId
              ? {
                  ...item,
                  status: update.status,
                  chunkCount: update.chunkCount ?? item.chunkCount,
                  errorMessage: null,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        }));
      }, update.delay);
    }
  }, []);

  function handleCreateBase(name: string) {
    setCreatingBase(true);
    setPageError(null);

    window.setTimeout(() => {
      const base: KnowledgeBase = {
        id: createKnowledgeBaseId(),
        name,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      setKnowledgeBases((current) => [...current, base]);
      setDocumentsByBase((current) => ({ ...current, [base.id]: [] }));
      setSelectedBaseId(base.id);
      setCreatingBase(false);
      setDialogOpen(false);
      setSuccessMessage(`知识库「${name}」已创建`);
    }, 400);
  }

  function handleUpload(files: File[]) {
    if (!selectedBaseId) {
      setPageError("请先创建并选择一个知识库");
      return;
    }

    setUploading(true);
    setPageError(null);
    setSuccessMessage(null);

    const baseId = selectedBaseId;
    const createdAt = new Date().toISOString();
    const newDocuments: KnowledgeDocument[] = files.map((file) => ({
      id: createDocumentId(),
      knowledgeBaseId: baseId,
      fileName: file.name,
      fileType: getFileExtension(file.name) || "unknown",
      sizeBytes: file.size,
      status: "uploaded",
      chunkCount: null,
      errorMessage: null,
      updatedAt: createdAt,
    }));

    window.setTimeout(() => {
      setDocumentsByBase((current) => ({
        ...current,
        [baseId]: [...(current[baseId] ?? []), ...newDocuments],
      }));
      setUploading(false);
      setSuccessMessage(`已添加 ${newDocuments.length} 个文件，正在解析与索引`);
      newDocuments.forEach((document) =>
        scheduleStatusProgress(baseId, document.id, document.sizeBytes),
      );
    }, 500);
  }

  function handleRetry(documentId: string) {
    if (!selectedBaseId) return;
    const baseId = selectedBaseId;
    const target = (documentsByBase[baseId] ?? []).find((item) => item.id === documentId);
    if (!target) return;

    setDocumentsByBase((current) => ({
      ...current,
      [baseId]: (current[baseId] ?? []).map((item) =>
        item.id === documentId
          ? {
              ...item,
              status: "uploaded",
              errorMessage: null,
              chunkCount: null,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
    scheduleStatusProgress(baseId, documentId, target.sizeBytes);
  }

  function handleDelete(documentId: string) {
    if (!selectedBaseId) return;
    const baseId = selectedBaseId;
    setDocumentsByBase((current) => ({
      ...current,
      [baseId]: (current[baseId] ?? []).filter((item) => item.id !== documentId),
    }));
  }

  if (!knowledgeBases.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="知识库"
          description="上传 PDF、Word、Markdown 等资料，供机器人检索回答。"
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              新建知识库
            </Button>
          }
        />
        <div className="px-4 sm:px-6 lg:px-page">
          <EmptyState
            title="还没有知识库"
            description="创建第一个知识库，然后上传产品手册、FAQ 或内部文档。"
            icon={<BookOpenText className="h-6 w-6" aria-hidden />}
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <FolderPlus className="h-4 w-4" aria-hidden />
                创建第一个知识库
              </Button>
            }
          />
        </div>
        <CreateKnowledgeBaseDialog
          open={dialogOpen}
          loading={creatingBase}
          onClose={() => setDialogOpen(false)}
          onCreate={handleCreateBase}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="知识库"
        description={
          selectedBase
            ? `当前：${selectedBase.name} · ${documents.length} 个文件`
            : "管理文档上传、解析与索引状态"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {knowledgeBases.length > 1 ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="sr-only">切换知识库</span>
                <select
                  className="h-10 rounded-control border border-input bg-background px-3 text-sm text-foreground"
                  value={selectedBaseId ?? ""}
                  onChange={(event) => setSelectedBaseId(event.target.value)}
                >
                  {knowledgeBases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              新建知识库
            </Button>
          </div>
        }
      />

      <div className="space-y-6 px-4 sm:px-6 lg:px-page">
        {pageError ? <Alert variant="error" title={pageError} /> : null}
        {successMessage ? <Alert variant="success" title={successMessage} /> : null}

        <UploadZone loading={uploading} onFilesSelected={handleUpload} />

        {uploading ? (
          <div className="space-y-3 rounded-card border border-border bg-card p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : documents.length ? (
          <DocumentList documents={documents} onRetry={handleRetry} onDelete={handleDelete} />
        ) : (
          <EmptyState
            title="还没有文件"
            description="使用上方上传区添加文档。支持拖拽，也可点击「选择文件」。"
            icon={<BookOpenText className="h-6 w-6" aria-hidden />}
          />
        )}
      </div>

      <CreateKnowledgeBaseDialog
        open={dialogOpen}
        loading={creatingBase}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateBase}
      />
    </div>
  );
}
