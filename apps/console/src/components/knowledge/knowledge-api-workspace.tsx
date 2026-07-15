"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  FileWarning,
  FolderPlus,
  Plus,
} from "lucide-react";

import { Alert, Badge, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { CreateKnowledgeBaseDialog } from "@/components/knowledge/create-knowledge-base-dialog";
import { DocumentList } from "@/components/knowledge/document-list";
import { KnowledgeBaseSettingsCard } from "@/components/knowledge/knowledge-base-settings-card";
import { UploadZone } from "@/components/knowledge/upload-zone";
import { isApiError } from "@/lib/api/errors";
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  getDocument,
  getKnowledgeBase,
  listKnowledgeBaseDocuments,
  listKnowledgeBases,
  reindexDocument,
  updateKnowledgeBase,
  uploadDocuments,
} from "@/lib/knowledge/api";
import { getFileExtension } from "@/lib/knowledge/format";
import {
  getKnowledgeBaseStatusBadgeVariant,
  KNOWLEDGE_BASE_STATUS_LABELS,
} from "@/lib/knowledge/status-labels";
import type { KnowledgeBase, KnowledgeDocument } from "@/lib/knowledge/types";
import { isInProgressStatus } from "@/lib/knowledge/types";

const POLL_INTERVAL_MS = 2000;

function resolveFileType(file: File): string {
  if (file.type) return file.type;
  const extension = getFileExtension(file.name);
  return extension || "application/octet-stream";
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function KnowledgeApiWorkspace() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingBase, setCreatingBase] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshingDocuments, setRefreshingDocuments] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingBase, setDeletingBase] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const selectedBaseIdRef = useRef<string | null>(null);

  const selectedBase =
    knowledgeBases.find((item) => item.id === selectedBaseId) ?? null;

  const readyCount = selectedBase?.readyDocumentCount ?? 0;
  const failedCount = selectedBase?.failedDocumentCount ?? 0;
  const processingCount = documents.filter((document) =>
    isInProgressStatus(document.status),
  ).length;
  const totalDocuments = knowledgeBases.reduce(
    (sum, base) => sum + base.documentCount,
    0,
  );
  const totalReady = knowledgeBases.reduce(
    (sum, base) => sum + base.readyDocumentCount,
    0,
  );
  const totalFailed = knowledgeBases.reduce(
    (sum, base) => sum + base.failedDocumentCount,
    0,
  );

  const refreshSelectedBase = useCallback(async (baseId: string) => {
    const [base, nextDocuments] = await Promise.all([
      getKnowledgeBase(baseId),
      listKnowledgeBaseDocuments(baseId),
    ]);

    setKnowledgeBases((current) =>
      current.map((item) => (item.id === baseId ? base : item)),
    );
    setDocuments(nextDocuments);
    return { base, documents: nextDocuments };
  }, []);

  const loadKnowledgeBases = useCallback(async () => {
    const bases = await listKnowledgeBases();
    setKnowledgeBases(bases);
    return bases;
  }, []);

  useEffect(() => {
    selectedBaseIdRef.current = selectedBaseId;
  }, [selectedBaseId]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBootstrapping(true);
      setPageError(null);

      try {
        const bases = await loadKnowledgeBases();
        if (cancelled) return;

        const initialBaseId = bases[0]?.id ?? null;
        setSelectedBaseId(initialBaseId);
      } catch (error) {
        if (!cancelled) {
          setPageError(resolveErrorMessage(error, "加载知识库失败。"));
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadKnowledgeBases]);

  useEffect(() => {
    if (!selectedBaseId || bootstrapping) return;

    const baseId = selectedBaseId;
    let cancelled = false;

    async function loadDocuments() {
      setRefreshingDocuments(true);
      setPageError(null);

      try {
        await refreshSelectedBase(baseId);
      } catch (error) {
        if (!cancelled) {
          setPageError(resolveErrorMessage(error, "加载文档失败。"));
        }
      } finally {
        if (!cancelled) {
          setRefreshingDocuments(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [bootstrapping, refreshSelectedBase, selectedBaseId]);

  useEffect(() => {
    if (!selectedBaseId) return;

    const inProgressIds = documents
      .filter((document) => isInProgressStatus(document.status))
      .map((document) => document.id);

    if (!inProgressIds.length) return;

    const timer = window.setInterval(() => {
      void (async () => {
        const baseId = selectedBaseIdRef.current;
        if (!baseId) return;

        try {
          const updates = await Promise.all(
            inProgressIds.map((documentId) => getDocument(documentId)),
          );

          setDocuments((current) => {
            const byId = new Map(updates.map((document) => [document.id, document]));
            return current.map((document) => byId.get(document.id) ?? document);
          });

          const stillInProgress = updates.some((document) =>
            isInProgressStatus(document.status),
          );

          if (!stillInProgress) {
            await refreshSelectedBase(baseId);
          }
        } catch {
          // Ignore transient polling errors.
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [documents, refreshSelectedBase, selectedBaseId]);

  async function handleCreateBase(name: string) {
    setCreatingBase(true);
    setCreateError(null);
    setPageError(null);

    try {
      const created = await createKnowledgeBase(name);
      const bases = await loadKnowledgeBases();
      const nextBase = bases.find((base) => base.id === created.id) ?? created;

      setSelectedBaseId(nextBase.id);
      await refreshSelectedBase(nextBase.id);
      setDialogOpen(false);
      setSuccessMessage(`已创建知识库「${name}」。`);
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_ERROR") {
        setCreateError(error.message);
        setPageError(error.message);
      } else {
        setPageError(resolveErrorMessage(error, "创建知识库失败。"));
      }
    } finally {
      setCreatingBase(false);
    }
  }

  async function handleUpload(files: File[]) {
    if (!selectedBaseId) {
      setPageError("请先创建或选择一个知识库后再上传文件。");
      return;
    }

    if (selectedBase?.status === "disabled") {
      setPageError("此知识库已停用，请先启用后再上传。");
      return;
    }

    setUploading(true);
    setPageError(null);
    setSuccessMessage(null);

    const baseId = selectedBaseId;

    try {
      await uploadDocuments(
        baseId,
        files.map((file) => ({
          fileName: file.name,
          fileType: resolveFileType(file),
          sizeBytes: file.size,
        })),
      );

      await refreshSelectedBase(baseId);
      setSuccessMessage(`已排队处理 ${files.length} 个文件。`);
    } catch (error) {
      setPageError(resolveErrorMessage(error, "上传文档失败。"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRetry(documentId: string) {
    if (!selectedBaseId) return;

    const target = documents.find((document) => document.id === documentId);
    if (!target) return;

    setPageError(null);

    try {
      await reindexDocument(documentId);
      await refreshSelectedBase(selectedBaseId);
      setSuccessMessage(`正在重试「${target.fileName}」。`);
    } catch (error) {
      setPageError(resolveErrorMessage(error, "重试索引失败。"));
    }
  }

  function handleDeleteDocument(_documentId: string) {
    setPageError("文档删除 API 暂未接入，请通过后端管理。");
  }

  async function handleSaveName(name: string) {
    if (!selectedBaseId) return;

    setSavingSettings(true);
    setSettingsError(null);
    setPageError(null);

    try {
      await updateKnowledgeBase(selectedBaseId, { name });
      await loadKnowledgeBases();
      await refreshSelectedBase(selectedBaseId);
      setSuccessMessage(`已重命名为「${name}」。`);
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_ERROR") {
        setSettingsError(error.message);
      } else {
        setPageError(resolveErrorMessage(error, "更新知识库失败。"));
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleToggleStatus(status: "active" | "disabled") {
    if (!selectedBaseId || !selectedBase) return;

    setSavingSettings(true);
    setSettingsError(null);
    setPageError(null);

    try {
      await updateKnowledgeBase(selectedBaseId, { status });
      await loadKnowledgeBases();
      await refreshSelectedBase(selectedBaseId);
      setSuccessMessage(
        status === "disabled"
          ? `已停用「${selectedBase.name}」。`
          : `已启用「${selectedBase.name}」。`,
      );
    } catch (error) {
      setPageError(resolveErrorMessage(error, "更新知识库状态失败。"));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDeleteBase() {
    if (!selectedBaseId || !selectedBase) return;

    const deletedName = selectedBase.name;
    const deletedId = selectedBaseId;

    setDeletingBase(true);
    setPageError(null);
    setSettingsError(null);

    try {
      await deleteKnowledgeBase(deletedId);
      const bases = await loadKnowledgeBases();
      const nextSelectedId = bases.find((base) => base.id !== deletedId)?.id ?? null;

      setSelectedBaseId(nextSelectedId);
      setDocuments([]);

      if (nextSelectedId) {
        await refreshSelectedBase(nextSelectedId);
      }

      setSuccessMessage(`已删除「${deletedName}」。`);
    } catch (error) {
      setPageError(resolveErrorMessage(error, "删除知识库失败。"));
    } finally {
      setDeletingBase(false);
    }
  }

  if (bootstrapping) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="知识库"
          description="管理检索集合、上传源文档并监控解析进度。"
        />
        <div className="px-4 sm:px-6 lg:px-page">
          <ConsoleDataModeBanner feature="知识库" />
        </div>
        <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-page">
          <div className="space-y-3">
            <Skeleton className="h-[220px] rounded-card" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Skeleton className="h-[92px] rounded-card" />
              <Skeleton className="h-[92px] rounded-card" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[200px] rounded-card" />
            <Skeleton className="h-[320px] rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (!knowledgeBases.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="知识库"
          description="上传产品文档、政策、FAQ 与支持资料，供机器人检索引用。"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ConsoleModeBadge />
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                新建知识库
              </Button>
            </div>
          }
        />
        <div className="px-4 sm:px-6 lg:px-page">
          {pageError ? <Alert variant="error" title={pageError} className="mb-4" /> : null}
          {createError ? (
            <Alert variant="error" title={createError} className="mb-4" />
          ) : null}
          <ConsoleDataModeBanner feature="知识库" />
          <EmptyState
            title="暂无知识库"
            description="请先创建第一个知识库，再上传源文档。"
            icon={<BookOpenText className="h-6 w-6" aria-hidden />}
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <FolderPlus className="h-4 w-4" aria-hidden />
                创建知识库
              </Button>
            }
          />
        </div>
        <CreateKnowledgeBaseDialog
          open={dialogOpen}
          loading={creatingBase}
          onClose={() => {
            setDialogOpen(false);
            setCreateError(null);
          }}
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
            ? `${selectedBase.name} 共 ${selectedBase.documentCount} 个文档，${readyCount} 个可用于检索。`
            : "选择知识库以管理文档。"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleModeBadge />
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              新建知识库
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-page">
        <ConsoleDataModeBanner feature="知识库" />
      </div>

      <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-page">
        <aside className="space-y-3">
          <div className="rounded-card border border-border bg-card p-3 shadow-card">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-foreground">
              <BookOpenText className="h-4 w-4 text-primary" aria-hidden />
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
                    <span className="flex items-center gap-2">
                      <span className="block truncate font-medium">{base.name}</span>
                      {base.status === "disabled" ? (
                        <Badge
                          variant={getKnowledgeBaseStatusBadgeVariant(base.status)}
                          className="shrink-0"
                        >
                          {KNOWLEDGE_BASE_STATUS_LABELS[base.status]}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="block text-xs opacity-80">
                      {base.documentCount} 个文档 · {base.readyDocumentCount} 个就绪
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StatusStat label="全部文档" value={totalDocuments} />
            <StatusStat label="就绪" value={totalReady} />
            <StatusStat label="处理中" value={processingCount} />
            <StatusStat label="失败" value={totalFailed} tone="warning" />
          </div>
        </aside>

        <main className="space-y-6">
          {pageError ? <Alert variant="error" title={pageError} /> : null}
          {successMessage ? (
            <Alert variant="success" title={successMessage}>
              {processingCount > 0 ? "文档将依次经过解析与索引。" : null}
            </Alert>
          ) : null}

          {selectedBase ? (
            <section className="grid gap-3 md:grid-cols-3">
              <CollectionInfoCard
                label="当前知识库"
                value={selectedBase.name}
                hint={`此集合共 ${selectedBase.documentCount} 个文档`}
              />
              <CollectionInfoCard
                label="就绪覆盖率"
                value={`${readyCount}/${selectedBase.documentCount || 0}`}
                hint="就绪文档可被机器人引用"
              />
              <CollectionInfoCard
                label="需关注"
                value={String(failedCount)}
                hint={failedCount ? "请在下方列表中重试失败文件" : "当前无阻塞文件"}
                tone={failedCount ? "warning" : "default"}
              />
            </section>
          ) : null}

          {selectedBase ? (
            <KnowledgeBaseSettingsCard
              knowledgeBase={selectedBase}
              saving={savingSettings}
              deleting={deletingBase}
              saveError={settingsError}
              onSaveName={handleSaveName}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteBase}
            />
          ) : null}

          <UploadZone
            loading={uploading}
            disabled={!selectedBase || selectedBase.status === "disabled"}
            onFilesSelected={handleUpload}
          />

          {uploading || refreshingDocuments ? (
            <div className="space-y-3 rounded-card border border-border bg-card p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : documents.length ? (
            <DocumentList
              documents={documents}
              onRetry={handleRetry}
              onDelete={handleDeleteDocument}
            />
          ) : (
            <EmptyState
              title="暂无上传文档"
              description="上传 PDF、DOCX、TXT 或 Markdown 文件，开始构建此知识库的可检索上下文。"
              icon={<BookOpenText className="h-6 w-6" aria-hidden />}
            />
          )}
        </main>
      </div>

      <CreateKnowledgeBaseDialog
        open={dialogOpen}
        loading={creatingBase}
        onClose={() => {
          setDialogOpen(false);
          setCreateError(null);
        }}
        onCreate={handleCreateBase}
      />
    </div>
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
      <div
        className={`flex items-center gap-2 text-xs font-medium uppercase ${
          tone === "warning" ? "text-warning" : "text-muted-foreground"
        }`}
      >
        {tone === "warning" ? (
          <FileWarning className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        )}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CollectionInfoCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-semibold ${
          tone === "warning" ? "text-warning" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
