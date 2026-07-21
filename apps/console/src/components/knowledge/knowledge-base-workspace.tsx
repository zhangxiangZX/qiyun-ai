"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Database,
  FolderPlus,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  PageHeader,
  Skeleton,
} from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { CreateKnowledgeBaseDialog } from "@/components/knowledge/create-knowledge-base-dialog";
import { DocumentChunksPanel } from "@/components/knowledge/document-chunks-panel";
import { DocumentList } from "@/components/knowledge/document-list";
import { KnowledgeProcessingBanner } from "@/components/knowledge/knowledge-processing-banner";
import { KnowledgeStorageNotice } from "@/components/knowledge/knowledge-storage-notice";
import { UploadBatchSummary } from "@/components/knowledge/upload-batch-summary";
import {
  UploadProgressList,
  type UploadQueueItem,
} from "@/components/knowledge/upload-progress-list";
import { UploadZone } from "@/components/knowledge/upload-zone";
import {
  createKnowledgeBase,
  deleteDocument,
  getDocument,
  listKnowledgeBaseDocuments,
  listKnowledgeBases,
  reindexDocument,
  reparseDocument,
  uploadDocumentFiles,
} from "@/lib/knowledge/api";
import {
  getKnowledgeCapabilities,
  type KnowledgeCapabilities,
} from "@/lib/knowledge/capabilities";
import { formatDeleteDocumentSuccessMessage } from "@/lib/knowledge/delete-result";
import { DOCUMENT_POLL_INTERVAL_SECONDS } from "@/lib/knowledge/status-labels";
import type { KnowledgeBase, KnowledgeDocument } from "@/lib/knowledge/types";
import { isInProgressStatus } from "@/lib/knowledge/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

type PageLoadState = "loading" | "ready" | "error";

function mapProcessingQueueItem(
  item: UploadQueueItem,
  document: KnowledgeDocument,
): UploadQueueItem {
  if (document.status === "ready") {
    return {
      ...item,
      status: "completed",
      phase: "done",
      processingStatus: document.status,
      processingError: null,
      processingErrorCode: null,
    };
  }
  if (document.status === "failed") {
    return {
      ...item,
      status: "processing_failed",
      phase: "done",
      processingStatus: document.status,
      processingError: document.errorMessage,
      processingErrorCode: document.errorCode,
    };
  }
  return {
    ...item,
    status: "processing",
    phase: "processing",
    processingStatus: document.status,
    processingError: null,
    processingErrorCode: null,
  };
}

function syncUploadQueueItems(
  queue: UploadQueueItem[],
  nextDocuments: KnowledgeDocument[],
): UploadQueueItem[] {
  if (!queue.length) {
    return queue;
  }

  const documentsById = new Map(nextDocuments.map((document) => [document.id, document]));
  return queue.map((item) => {
    if (item.status !== "processing" || !item.documentId) {
      return item;
    }

    const document = documentsById.get(item.documentId);
    if (!document) {
      return item;
    }

    return mapProcessingQueueItem(item, document);
  });
}

export function KnowledgeBaseWorkspace({ focusUpload = false }: { focusUpload?: boolean }) {
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

  const [pageLoadState, setPageLoadState] = useState<PageLoadState>("loading");
  const [pageError, setPageError] = useState<unknown>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<unknown>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingBase, setCreatingBase] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; title: string } | null>(
    null,
  );

  const [capabilities, setCapabilities] = useState<KnowledgeCapabilities | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [reindexingDocumentId, setReindexingDocumentId] = useState<string | null>(null);

  const [chunksPanel, setChunksPanel] = useState<{
    documentId: string;
    fileName: string;
  } | null>(null);

  const selectedBase = useMemo(
    () => knowledgeBases.find((item) => item.id === selectedBaseId) ?? null,
    [knowledgeBases, selectedBaseId],
  );

  const readyCount = documents.filter((document) => document.status === "ready").length;
  const processingCount = documents.filter((document) => isInProgressStatus(document.status)).length;
  const failedCount = documents.filter((document) => document.status === "failed").length;

  const uploadQueueProcessingKey = useMemo(
    () =>
      uploadQueue
        .filter((item) => item.status === "processing" && item.documentId)
        .map((item) => `${item.documentId}:${item.processingStatus}`)
        .join(","),
    [uploadQueue],
  );

  const loadKnowledgeBases = useCallback(async () => {
    setPageLoadState("loading");
    setPageError(null);
    try {
      const [bases, caps] = await Promise.all([
        listKnowledgeBases(),
        getKnowledgeCapabilities(),
      ]);
      setKnowledgeBases(bases);
      setCapabilities(caps);
      setSelectedBaseId((current) => {
        if (current && bases.some((base) => base.id === current)) {
          return current;
        }
        return bases[0]?.id ?? "";
      });
      setPageLoadState("ready");
    } catch (error) {
      setPageError(error);
      setKnowledgeBases([]);
      setPageLoadState("error");
    }
  }, []);

  const loadDocuments = useCallback(async (baseId: string) => {
    if (!baseId) {
      setDocuments([]);
      return;
    }

    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const nextDocuments = await listKnowledgeBaseDocuments(baseId);
      setDocuments(nextDocuments);
      setUploadQueue((current) => syncUploadQueueItems(current, nextDocuments));
    } catch (error) {
      setDocumentsError(error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  useOnWorkspaceChanged(() => {
    void loadKnowledgeBases();
  });

  useEffect(() => {
    if (!selectedBaseId) {
      setDocuments([]);
      return;
    }
    void loadDocuments(selectedBaseId);
  }, [loadDocuments, selectedBaseId]);

  useEffect(() => {
    const hasInProgress = documents.some((document) => isInProgressStatus(document.status));
    if (!hasInProgress || !selectedBaseId) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadDocuments(selectedBaseId);
    }, DOCUMENT_POLL_INTERVAL_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [documents, loadDocuments, selectedBaseId]);

  useEffect(() => {
    const processingIds = uploadQueue
      .filter((item) => item.status === "processing" && item.documentId)
      .map((item) => item.documentId as string);

    if (!processingIds.length) {
      return;
    }

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const updates = await Promise.all(processingIds.map((id) => getDocument(id)));
          setUploadQueue((current) => {
            const byId = new Map(updates.map((document) => [document.id, document]));
            return current.map((item) => {
              if (!item.documentId || item.status !== "processing") {
                return item;
              }
              const document = byId.get(item.documentId);
              return document ? mapProcessingQueueItem(item, document) : item;
            });
          });
          setDocuments((current) => {
            const byId = new Map(updates.map((document) => [document.id, document]));
            return current.map((document) => byId.get(document.id) ?? document);
          });
        } catch {
          // 轮询失败时保持当前状态，下次继续
        }
      })();
    }, DOCUMENT_POLL_INTERVAL_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [uploadQueueProcessingKey, uploadQueue]);

  async function handleCreateBase(name: string) {
    setCreatingBase(true);
    setCreateError(null);
    try {
      const base = await createKnowledgeBase(name);
      setKnowledgeBases((current) => [...current, base]);
      setSelectedBaseId(base.id);
      setDialogOpen(false);
      setFeedback({ variant: "success", title: `已创建知识库「${name}」` });
    } catch (error) {
      setCreateError(
        resolveRequestErrorPresentation(error, "创建知识库失败，请稍后重试。").message,
      );
    } finally {
      setCreatingBase(false);
    }
  }

  async function processUploadQueue(baseId: string, files: File[]) {
    setUploading(true);
    setFeedback(null);

    const queueItems: UploadQueueItem[] = files.map((file) => ({
      fileName: file.name,
      status: "queued",
      phase: "upload",
    }));
    setUploadQueue((current) => [...current, ...queueItems]);

    for (const file of files) {
      pendingFilesRef.current.set(file.name, file);
      setUploadQueue((current) =>
        current.map((item) =>
          item.fileName === file.name && item.status === "queued"
            ? { ...item, status: "uploading", phase: "upload" }
            : item,
        ),
      );

      try {
        const uploaded = await uploadDocumentFiles(baseId, [file]);
        const document = uploaded[0];
        if (!document) {
          throw new Error("上传成功但未返回文档记录。");
        }

        setUploadQueue((current) =>
          current.map((item) =>
            item.fileName === file.name
              ? {
                  ...item,
                  status: "processing",
                  phase: "processing",
                  documentId: document.id,
                  processingStatus: document.status,
                }
              : item,
          ),
        );
        setDocuments((current) => {
          const exists = current.some((entry) => entry.id === document.id);
          return exists ? current : [...current, document];
        });
      } catch (error) {
        const message = resolveRequestErrorPresentation(error, "文件上传失败。").message;
        setUploadQueue((current) =>
          current.map((item) =>
            item.fileName === file.name
              ? { ...item, status: "upload_error", phase: "upload", errorMessage: message }
              : item,
          ),
        );
      }
    }

    setUploading(false);
    void loadDocuments(baseId);
  }

  function handleUpload(files: File[]) {
    if (!selectedBaseId) {
      setFeedback({ variant: "error", title: "请先创建或选择知识库，再上传文档。" });
      return;
    }
    void processUploadQueue(selectedBaseId, files);
  }

  function handleRetryUpload(fileName: string) {
    const file = pendingFilesRef.current.get(fileName);
    if (!file || !selectedBaseId) {
      setFeedback({ variant: "error", title: "无法重试：原始文件已不在队列中，请重新选择文件上传。" });
      return;
    }
    setUploadQueue((current) => current.filter((item) => item.fileName !== fileName));
    void processUploadQueue(selectedBaseId, [file]);
  }

  async function handleRetryDocument(documentId: string) {
    setReindexingDocumentId(documentId);
    setFeedback(null);
    try {
      const updated = await reindexDocument(documentId);
      setDocuments((current) =>
        current.map((document) => (document.id === documentId ? updated : document)),
      );
      setFeedback({ variant: "success", title: "已重新排队索引，请稍候查看处理状态。" });
    } catch (error) {
      setFeedback({
        variant: "error",
        title: resolveRequestErrorPresentation(error, "重试索引失败。").message,
      });
    } finally {
      setReindexingDocumentId(null);
    }
  }

  async function handleReparseDocument(documentId: string) {
    setReindexingDocumentId(documentId);
    setFeedback(null);
    try {
      const updated = await reparseDocument(documentId);
      setDocuments((current) =>
        current.map((document) => (document.id === documentId ? updated : document)),
      );
      setFeedback({ variant: "success", title: "已重新排队解析，请稍候查看处理状态。" });
    } catch (error) {
      setFeedback({
        variant: "error",
        title: resolveRequestErrorPresentation(error, "重新解析失败。").message,
      });
    } finally {
      setReindexingDocumentId(null);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;

    setDeletingDocumentId(documentId);
    setFeedback(null);
    try {
      const result = await deleteDocument(documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      setFeedback({
        variant: "success",
        title: formatDeleteDocumentSuccessMessage(target.fileName, result),
      });
      void loadKnowledgeBases();
    } catch (error) {
      setFeedback({
        variant: "error",
        title: resolveRequestErrorPresentation(error, "删除文档失败。").message,
      });
    } finally {
      setDeletingDocumentId(null);
    }
  }

  const pageTitle = focusUpload ? "上传文档" : "知识库";
  const pageDescription = focusUpload
    ? "将产品手册、方案与 FAQ 上传到知识库，供 AI 助手检索引用。"
    : "管理企业资料文档，供 AI 助手检索与引用。";

  if (pageLoadState === "loading") {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="知识库" />
        </ConsolePageAlerts>
        <PageHeader variant="compact" title={pageTitle} description={pageDescription} />
        <Skeleton className="h-96 w-full rounded-card" />
      </ConsolePage>
    );
  }

  if (pageLoadState === "error") {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="知识库" />
        </ConsolePageAlerts>
        <PageHeader variant="compact" title={pageTitle} description={pageDescription} />
        <ConsoleRequestError
          {...resolveRequestErrorPresentation(pageError, "知识库列表加载失败。")}
          onRetry={() => void loadKnowledgeBases()}
        />
      </ConsolePage>
    );
  }

  if (!knowledgeBases.length) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="知识库" />
          <KnowledgeStorageNotice />
        </ConsolePageAlerts>
        <PageHeader
          variant="compact"
          title={pageTitle}
          description={pageDescription}
          actions={
            <Button onClick={() => setDialogOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              新建知识库
            </Button>
          }
        />
        <ConsolePageSection>
          <ConsoleEmptyState
            preset="noKnowledgeBases"
            action={
              <Button onClick={() => setDialogOpen(true)} leftIcon={<FolderPlus className="h-4 w-4" />}>
                创建知识库
              </Button>
            }
          />
        </ConsolePageSection>
        <CreateKnowledgeBaseDialog
          open={dialogOpen}
          loading={creatingBase}
          error={createError}
          onClose={() => {
            setDialogOpen(false);
            setCreateError(null);
          }}
          onCreate={handleCreateBase}
        />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="知识库" />
        <KnowledgeStorageNotice />
        {feedback ? (
          <ConsoleFeedback
            variant={feedback.variant}
            title={feedback.title}
            onDismiss={() => setFeedback(null)}
          />
        ) : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        title={pageTitle}
        description={
          selectedBase
            ? `${selectedBase.name} · 共 ${documents.length} 份文档，${readyCount} 份可用于检索`
            : pageDescription
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleModeBadge />
            {focusUpload ? (
              <Button variant="outline" asChild>
                <Link href="/dashboard/knowledge-bases">返回知识库列表</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/dashboard/knowledge-bases/upload">上传文档</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard/conversations/test">测试问答</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => void loadDocuments(selectedBaseId)}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              刷新
            </Button>
            <Button onClick={() => setDialogOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              新建知识库
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-card border border-border bg-card p-3 shadow-card">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-foreground">
              <Database className="h-4 w-4 text-primary" aria-hidden />
              知识库列表
            </div>
            <div className="space-y-1">
              {knowledgeBases.map((base) => {
                const selected = base.id === selectedBaseId;
                return (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => setSelectedBaseId(base.id)}
                    className={`w-full rounded-control px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{base.name}</span>
                      <Badge
                        variant={base.status === "active" ? "success" : "warning"}
                        className="shrink-0"
                      >
                        {base.status === "active" ? "启用" : "停用"}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-xs opacity-80">
                      {base.readyDocumentCount}/{base.documentCount} 可用
                      {base.failedDocumentCount > 0 ? ` · ${base.failedDocumentCount} 失败` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <StatusStat label="可用" value={readyCount} />
            <StatusStat label="处理中" value={processingCount} />
            <StatusStat label="失败" value={failedCount} tone={failedCount > 0 ? "warning" : "default"} />
          </div>
        </aside>

        <main className="space-y-6">
          {selectedBase?.status === "disabled" ? (
            <Alert variant="warning" title="知识库已停用">
              该知识库处于停用状态，机器人不会检索其中文档。可在后续版本中支持启用/停用切换。
            </Alert>
          ) : null}

          <KnowledgeProcessingBanner documents={documents} />

          <UploadZone
            loading={uploading}
            autoUpload
            disabled={!selectedBaseId || selectedBase?.status === "disabled"}
            disabledReason={
              selectedBase?.status === "disabled"
                ? "知识库已停用，无法上传新文档。"
                : !selectedBaseId
                  ? "请先创建或选择知识库，再上传文档。"
                  : undefined
            }
            onFilesSelected={handleUpload}
          />

          <UploadBatchSummary
            items={uploadQueue}
            onDismiss={() => setUploadQueue([])}
          />

          <UploadProgressList
            items={uploadQueue}
            onRetryUpload={handleRetryUpload}
            onRetryProcessing={handleRetryDocument}
          />

          {documentsError ? (
            <ConsoleRequestError
              {...resolveRequestErrorPresentation(documentsError, "文档列表加载失败。")}
              onRetry={() => void loadDocuments(selectedBaseId)}
            />
          ) : null}

          {documentsLoading && !documents.length ? (
            <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : documents.length ? (
            <DocumentList
              documents={documents}
              loading={documentsLoading}
              onRetry={handleRetryDocument}
              onReparse={handleReparseDocument}
              onPreviewChunks={(documentId, fileName) =>
                setChunksPanel({ documentId, fileName })
              }
              onDelete={handleDeleteDocument}
              documentDeleteAvailable={capabilities?.documentDeleteAvailable ?? false}
              documentDeleteHint={
                capabilities?.documentDeleteHint ?? "单文档删除尚未接通。"
              }
              deletingDocumentId={deletingDocumentId}
              reprocessingDocumentId={reindexingDocumentId}
            />
          ) : (
            <ConsoleEmptyState preset="noDocuments" />
          )}

          {reindexingDocumentId ? (
            <Alert variant="info" title="正在重新索引">
              文档已重新排队，状态将每 {DOCUMENT_POLL_INTERVAL_SECONDS} 秒自动刷新。
            </Alert>
          ) : null}
        </main>
      </div>

      <DocumentChunksPanel
        documentId={chunksPanel?.documentId ?? null}
        fileName={chunksPanel?.fileName ?? ""}
        open={Boolean(chunksPanel)}
        onOpenChange={(open) => {
          if (!open) setChunksPanel(null);
        }}
      />

      <CreateKnowledgeBaseDialog
        open={dialogOpen}
        loading={creatingBase}
        error={createError}
        onClose={() => {
          setDialogOpen(false);
          setCreateError(null);
        }}
        onCreate={handleCreateBase}
      />
    </ConsolePage>
  );
}

function StatusStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <CheckCircle2
          className={`h-3.5 w-3.5 ${tone === "warning" && value > 0 ? "text-warning" : ""}`}
          aria-hidden
        />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
