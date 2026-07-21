"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileCode2,
  FileText,
  FileType,
  RefreshCw,
} from "lucide-react";

import { Badge, Button, PageHeader, Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsolePage, ConsolePageAlerts, ConsolePageSection } from "@/components/console/console-page-shell";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { DocumentFailurePanel } from "@/components/knowledge/document-failure-panel";
import { DocumentPipelineStepper } from "@/components/knowledge/document-pipeline-stepper";
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
import { ALLOWED_EXTENSIONS } from "@/lib/knowledge/constants";
import { formatDeleteDocumentSuccessMessage } from "@/lib/knowledge/delete-result";
import { formatFileSize } from "@/lib/knowledge/format";
import {
  DOCUMENT_DISPLAY_STATUS_LABELS,
  DOCUMENT_POLL_INTERVAL_SECONDS,
  DOCUMENT_STATUS_POLLING_NOTE,
} from "@/lib/knowledge/status-labels";
import type { KnowledgeBase, KnowledgeDocument } from "@/lib/knowledge/types";
import { isInProgressStatus } from "@/lib/knowledge/types";

const FORMATS = [
  { label: "PDF", icon: FileText, tone: "text-red-500" },
  { label: "DOCX", icon: FileType, tone: "text-blue-500" },
  { label: "TXT", icon: FileText, tone: "text-slate-500" },
  { label: "MD", icon: FileCode2, tone: "text-violet-500" },
  { label: "HTML", icon: FileCode2, tone: "text-cyan-500" },
];

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

export function KnowledgeUploadWorkspace() {
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [basesLoading, setBasesLoading] = useState(true);
  const [basesError, setBasesError] = useState<unknown>(null);
  const [selectedBaseId, setSelectedBaseId] = useState("");
  const [creatingBase, setCreatingBase] = useState(false);

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<unknown>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; title: string } | null>(
    null,
  );
  const [capabilities, setCapabilities] = useState<KnowledgeCapabilities | null>(null);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);

  const selectedBase = useMemo(
    () => bases.find((item) => item.id === selectedBaseId) ?? null,
    [bases, selectedBaseId],
  );

  const uploadQueueProcessingKey = useMemo(
    () =>
      uploadQueue
        .filter((item) => item.status === "processing" && item.documentId)
        .map((item) => `${item.documentId}:${item.processingStatus}`)
        .join(","),
    [uploadQueue],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      queued: uploadQueue.filter((item) => item.status === "queued" || item.status === "uploading")
        .length,
      uploaded: 0,
      parsing: 0,
      indexing: 0,
      ready: 0,
      failed: 0,
    };
    for (const document of documents) {
      counts[document.status] = (counts[document.status] ?? 0) + 1;
    }
    return counts;
  }, [documents, uploadQueue]);

  const loadBases = useCallback(async () => {
    setBasesLoading(true);
    setBasesError(null);
    try {
      const [next, caps] = await Promise.all([listKnowledgeBases(), getKnowledgeCapabilities()]);
      setBases(next);
      setCapabilities(caps);
      setSelectedBaseId((current) => {
        if (current && next.some((base) => base.id === current)) return current;
        return next[0]?.id ?? "";
      });
    } catch (error) {
      setBases([]);
      setSelectedBaseId("");
      setBasesError(error);
    } finally {
      setBasesLoading(false);
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
      setUploadQueue((current) =>
        current.map((item) => {
          if (item.status !== "processing" || !item.documentId) return item;
          const document = nextDocuments.find((entry) => entry.id === item.documentId);
          return document ? mapProcessingQueueItem(item, document) : item;
        }),
      );
    } catch (error) {
      setDocumentsError(error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBases();
  }, [loadBases]);

  useEffect(() => {
    if (!selectedBaseId) {
      setDocuments([]);
      return;
    }
    void loadDocuments(selectedBaseId);
  }, [loadDocuments, selectedBaseId]);

  useEffect(() => {
    const hasInProgress = documents.some((document) => isInProgressStatus(document.status));
    if (!hasInProgress || !selectedBaseId) return;
    const timer = window.setInterval(() => {
      void loadDocuments(selectedBaseId);
    }, DOCUMENT_POLL_INTERVAL_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [documents, loadDocuments, selectedBaseId]);

  useEffect(() => {
    const processingIds = uploadQueue
      .filter((item) => item.status === "processing" && item.documentId)
      .map((item) => item.documentId as string);
    if (!processingIds.length) return;

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const updates = await Promise.all(processingIds.map((id) => getDocument(id)));
          setUploadQueue((current) => {
            const byId = new Map(updates.map((document) => [document.id, document]));
            return current.map((item) => {
              if (!item.documentId || item.status !== "processing") return item;
              const document = byId.get(item.documentId);
              return document ? mapProcessingQueueItem(item, document) : item;
            });
          });
          setDocuments((current) => {
            const byId = new Map(updates.map((document) => [document.id, document]));
            return current.map((document) => byId.get(document.id) ?? document);
          });
        } catch {
          // keep current status; next poll retries
        }
      })();
    }, DOCUMENT_POLL_INTERVAL_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [uploadQueueProcessingKey, uploadQueue]);

  const handleCreateBase = useCallback(async () => {
    setCreatingBase(true);
    setFeedback(null);
    try {
      const base = await createKnowledgeBase("产品知识库");
      setBases((current) => [...current, base]);
      setSelectedBaseId(base.id);
      setFeedback({ variant: "success", title: `已创建知识库「${base.name}」` });
    } catch (error) {
      setFeedback({
        variant: "error",
        title: resolveRequestErrorPresentation(error, "创建知识库失败，请稍后重试。").message,
      });
    } finally {
      setCreatingBase(false);
    }
  }, []);

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
      setFeedback({
        variant: "error",
        title: "无法重试：原始文件已不在队列中，请重新选择文件上传。",
      });
      return;
    }
    setUploadQueue((current) => current.filter((item) => item.fileName !== fileName));
    void processUploadQueue(selectedBaseId, [file]);
  }

  async function handleRetryDocument(documentId: string) {
    setBusyDocumentId(documentId);
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
      setBusyDocumentId(null);
    }
  }

  async function handleReparseDocument(documentId: string) {
    setBusyDocumentId(documentId);
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
      setBusyDocumentId(null);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    if (!capabilities?.documentDeleteAvailable) {
      setFeedback({
        variant: "error",
        title: capabilities?.documentDeleteHint || "单文档删除尚未接通。",
      });
      return;
    }
    setBusyDocumentId(documentId);
    setFeedback(null);
    try {
      const result = await deleteDocument(documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      setFeedback({
        variant: "success",
        title: formatDeleteDocumentSuccessMessage(target.fileName, result),
      });
    } catch (error) {
      setFeedback({
        variant: "error",
        title: resolveRequestErrorPresentation(error, "删除文档失败。").message,
      });
    } finally {
      setBusyDocumentId(null);
    }
  }

  if (basesLoading) {
    return (
      <ConsolePage>
        <PageHeader
          variant="compact"
          title="知识库上传"
          description="将文档上传到已有知识库，状态由 DocumentStatus 轮询更新。"
        />
        <Skeleton className="h-96 w-full rounded-card" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <PageHeader
        variant="compact"
        title="知识库上传"
        description="上传后展示真实处理阶段：排队中 → 已接收 → 解析中 → 建索引中 → 已完成 / 失败。无字节级上传百分比。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/knowledge-bases">返回知识库</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/conversations/test">测试问答</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => void loadDocuments(selectedBaseId)}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              disabled={!selectedBaseId}
            >
              刷新状态
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="知识库上传" />
        {basesError ? (
          <ConsoleRequestError
            {...resolveRequestErrorPresentation(basesError, "知识库列表加载失败。")}
            onRetry={() => void loadBases()}
          />
        ) : null}
        {feedback ? (
          <ConsoleFeedback
            variant={feedback.variant}
            title={feedback.title}
            onDismiss={() => setFeedback(null)}
          />
        ) : null}
      </ConsolePageAlerts>

      {!bases.length ? (
        <ConsolePageSection>
          <ConsoleEmptyState
            preset="noKnowledgeBases"
            action={
              <Button loading={creatingBase} onClick={() => void handleCreateBase()}>
                新建知识库并继续
              </Button>
            }
          />
        </ConsolePageSection>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">上传文件</h2>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={selectedBaseId}
                onChange={(event) => setSelectedBaseId(event.target.value)}
                aria-label="选择知识库"
                disabled={uploading}
              >
                {bases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
            </div>
            <UploadZone
              loading={uploading}
              autoUpload
              disabled={!selectedBaseId || selectedBase?.status === "disabled"}
              disabledReason={
                selectedBase?.status === "disabled"
                  ? "知识库已停用，无法上传新文档。"
                  : !selectedBaseId
                    ? "请先新建或选择知识库后再上传文档。"
                    : undefined
              }
              onFilesSelected={handleUpload}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              支持 {ALLOWED_EXTENSIONS.join(" / ")}，单个文件最大 20MB。{DOCUMENT_STATUS_POLLING_NOTE}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {FORMATS.map((format) => (
                <span key={format.label} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <format.icon className={`h-3.5 w-3.5 ${format.tone}`} />
                  {format.label}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">处理状态汇总</h2>
            <p className="mb-3 text-xs text-muted-foreground">{DOCUMENT_STATUS_POLLING_NOTE}</p>
            <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  "queued",
                  "uploaded",
                  "parsing",
                  "indexing",
                  "ready",
                  "failed",
                ] as const
              ).map((status) => (
                <div key={status} className="rounded-lg bg-muted/40 py-2">
                  <div className="font-semibold text-foreground">{statusCounts[status] ?? 0}</div>
                  <div className="text-muted-foreground">
                    {DOCUMENT_DISPLAY_STATUS_LABELS[status]}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <UploadBatchSummary items={uploadQueue} onDismiss={() => setUploadQueue([])} />

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

          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                文档列表
                {selectedBase ? ` · ${selectedBase.name}` : ""}
              </h2>
            </div>
            {documentsLoading && !documents.length ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : documents.length ? (
              <ul className="divide-y divide-border">
                {documents.map((document) => (
                  <li key={document.id} className="space-y-3 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{document.fileName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatFileSize(document.sizeBytes)} ·{" "}
                          {DOCUMENT_DISPLAY_STATUS_LABELS[document.status]}
                          {document.chunkCount != null ? ` · ${document.chunkCount} 块` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          document.status === "ready"
                            ? "success"
                            : document.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {DOCUMENT_DISPLAY_STATUS_LABELS[document.status]}
                      </Badge>
                    </div>
                    {document.status !== "ready" && document.status !== "failed" ? (
                      <DocumentPipelineStepper status={document.status} compact />
                    ) : null}
                    {document.status === "failed" ? (
                      <DocumentFailurePanel
                        errorCode={document.errorCode}
                        errorMessage={document.errorMessage}
                        fileType={document.fileType}
                        compact
                        onRetry={() => void handleRetryDocument(document.id)}
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(document.status === "failed" || document.status === "ready") && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyDocumentId === document.id}
                            onClick={() => void handleRetryDocument(document.id)}
                          >
                            重试索引
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyDocumentId === document.id}
                            onClick={() => void handleReparseDocument(document.id)}
                          >
                            重新解析
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={
                          busyDocumentId === document.id ||
                          !(capabilities?.documentDeleteAvailable ?? false)
                        }
                        title={
                          capabilities?.documentDeleteAvailable
                            ? "删除文档"
                            : capabilities?.documentDeleteHint || "单文档删除尚未接通"
                        }
                        onClick={() => void handleDeleteDocument(document.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6">
                <ConsoleEmptyState preset="noDocuments" />
              </div>
            )}
          </section>
        </div>
      )}
    </ConsolePage>
  );
}
