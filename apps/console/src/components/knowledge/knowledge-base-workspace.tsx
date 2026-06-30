"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Database,
  FileWarning,
  FolderPlus,
  Plus,
  RotateCcw,
} from "lucide-react";

import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import { CreateKnowledgeBaseDialog } from "@/components/knowledge/create-knowledge-base-dialog";
import { DocumentList } from "@/components/knowledge/document-list";
import { UploadZone } from "@/components/knowledge/upload-zone";
import { getFileExtension } from "@/lib/knowledge/format";
import { createKnowledgeDemoState } from "@/lib/knowledge/mock-data";
import {
  createDocumentId,
  createKnowledgeBaseId,
} from "@/lib/knowledge/validation";
import type {
  KnowledgeBase,
  KnowledgeDocument,
} from "@/lib/knowledge/types";

function estimateChunkCount(sizeBytes: number): number {
  return Math.max(1, Math.round(sizeBytes / 2048));
}

export function KnowledgeBaseWorkspace() {
  const timersRef = useRef<number[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [documentsByBase, setDocumentsByBase] = useState<
    Record<string, KnowledgeDocument[]>
  >({});
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingBase, setCreatingBase] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBootstrapping(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const selectedBase =
    knowledgeBases.find((item) => item.id === selectedBaseId) ?? null;
  const documents = selectedBaseId ? documentsByBase[selectedBaseId] ?? [] : [];
  const readyCount = documents.filter((document) => document.status === "ready").length;
  const processingCount = documents.filter((document) =>
    ["uploaded", "parsing", "indexing"].includes(document.status),
  ).length;
  const failedCount = documents.filter((document) => document.status === "failed").length;
  const totalDocuments = knowledgeBases.reduce(
    (sum, base) => sum + (documentsByBase[base.id]?.length ?? 0),
    0,
  );
  const totalReady = Object.values(documentsByBase)
    .flat()
    .filter((document) => document.status === "ready").length;
  const totalFailed = Object.values(documentsByBase)
    .flat()
    .filter((document) => document.status === "failed").length;

  function queueTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function syncKnowledgeBaseCounts(nextDocumentsByBase: Record<string, KnowledgeDocument[]>) {
    setKnowledgeBases((current) =>
      current.map((base) => ({
        ...base,
        documentCount: nextDocumentsByBase[base.id]?.length ?? 0,
      })),
    );
  }

  function updateDocument(
    baseId: string,
    documentId: string,
    updater: (document: KnowledgeDocument) => KnowledgeDocument,
  ) {
    setDocumentsByBase((current) => ({
      ...current,
      [baseId]: (current[baseId] ?? []).map((document) =>
        document.id === documentId ? updater(document) : document,
      ),
    }));
  }

  function scheduleStatusProgress(baseId: string, document: KnowledgeDocument) {
    const willFail = document.fileName.toLowerCase().includes("fail");

    queueTimer(() => {
      updateDocument(baseId, document.id, (item) => ({
        ...item,
        status: "parsing",
        updatedAt: new Date().toISOString(),
      }));
    }, 700);

    queueTimer(() => {
      updateDocument(baseId, document.id, (item) => ({
        ...item,
        status: "indexing",
        updatedAt: new Date().toISOString(),
      }));
    }, 1700);

    queueTimer(() => {
      updateDocument(baseId, document.id, (item) => ({
        ...item,
        status: willFail ? "failed" : "ready",
        chunkCount: willFail ? null : estimateChunkCount(item.sizeBytes),
        errorMessage: willFail ? "Demo failure. Rename without 'fail' or retry." : null,
        updatedAt: new Date().toISOString(),
      }));
    }, 3000);
  }

  function handleCreateBase(name: string) {
    setCreatingBase(true);
    setPageError(null);

    queueTimer(() => {
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
      setSuccessMessage(`Created knowledge base "${name}".`);
    }, 350);
  }

  function handleLoadDemo() {
    const demo = createKnowledgeDemoState();
    setKnowledgeBases(demo.knowledgeBases);
    setDocumentsByBase(demo.documentsByBase);
    setSelectedBaseId(demo.selectedBaseId);
    setPageError(null);
    setSuccessMessage("Loaded demo collections with ready, processing, and failed documents.");
  }

  function handleResetAll() {
    setKnowledgeBases([]);
    setDocumentsByBase({});
    setSelectedBaseId(null);
    setPageError(null);
    setSuccessMessage("Reset demo data and cleared all knowledge base state.");
  }

  function handleUpload(files: File[]) {
    if (!selectedBaseId) {
      setPageError("Create or select a knowledge base before uploading files.");
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

    queueTimer(() => {
      setDocumentsByBase((current) => {
        const next = {
          ...current,
          [baseId]: [...(current[baseId] ?? []), ...newDocuments],
        };
        syncKnowledgeBaseCounts(next);
        return next;
      });
      setUploading(false);
      setSuccessMessage(`Queued ${newDocuments.length} file(s) for processing.`);
      newDocuments.forEach((document) => scheduleStatusProgress(baseId, document));
    }, 450);
  }

  function handleRetry(documentId: string) {
    if (!selectedBaseId) return;
    const baseId = selectedBaseId;
    const target = (documentsByBase[baseId] ?? []).find(
      (document) => document.id === documentId,
    );

    if (!target) return;

    const retried: KnowledgeDocument = {
      ...target,
      status: "uploaded",
      chunkCount: null,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    };

    updateDocument(baseId, documentId, () => retried);
    setSuccessMessage(`Retrying "${target.fileName}".`);
    scheduleStatusProgress(baseId, {
      ...retried,
      fileName: target.fileName.replace(/fail/gi, "retry"),
    });
  }

  function handleDelete(documentId: string) {
    if (!selectedBaseId) return;
    const baseId = selectedBaseId;

    setDocumentsByBase((current) => {
      const next = {
        ...current,
        [baseId]: (current[baseId] ?? []).filter(
          (document) => document.id !== documentId,
        ),
      };
      syncKnowledgeBaseCounts(next);
      return next;
    });
    setSuccessMessage("Removed document from the current collection.");
  }

  if (bootstrapping) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Knowledge bases"
          description="Prepare retrieval collections, upload source docs, and monitor parsing progress."
        />
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
          title="Knowledge bases"
          description="Upload product docs, policies, FAQs, and support material for retrieval."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleLoadDemo}>
                <Database className="h-4 w-4" aria-hidden />
                Load demo data
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                New knowledge base
              </Button>
            </div>
          }
        />
        <div className="px-4 sm:px-6 lg:px-page">
          <EmptyState
            title="No knowledge base yet"
            description="Create the first collection before uploading source documents, or load a demo workspace to preview parsing and failure states."
            icon={<BookOpenText className="h-6 w-6" aria-hidden />}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={handleLoadDemo}>
                  <Database className="h-4 w-4" aria-hidden />
                  Load demo data
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <FolderPlus className="h-4 w-4" aria-hidden />
                  Create knowledge base
                </Button>
              </div>
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
        title="Knowledge bases"
        description={
          selectedBase
            ? `${selectedBase.name} contains ${documents.length} document(s), with ${readyCount} ready for retrieval.`
            : "Select a knowledge base to manage documents."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={handleResetAll}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset demo
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              New knowledge base
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-page">
        <aside className="space-y-3">
          <div className="rounded-card border border-border bg-card p-3 shadow-card">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-foreground">
              <Database className="h-4 w-4 text-primary" aria-hidden />
              Collections
            </div>
            <div className="space-y-1">
              {knowledgeBases.map((base) => {
                const count = documentsByBase[base.id]?.length ?? 0;
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
                    <span className="block truncate font-medium">{base.name}</span>
                    <span className="block text-xs opacity-80">{count} document(s)</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StatusStat label="All docs" value={totalDocuments} />
            <StatusStat label="Ready" value={totalReady} />
            <StatusStat label="Selected processing" value={processingCount} />
            <StatusStat label="Failed" value={totalFailed} tone="warning" />
          </div>
        </aside>

        <main className="space-y-6">
          {pageError ? <Alert variant="error" title={pageError} /> : null}
          {successMessage ? (
            <Alert variant="success" title={successMessage}>
              {processingCount > 0 ? "Documents will move through parsing and indexing." : null}
            </Alert>
          ) : null}

          {selectedBase ? (
            <section className="grid gap-3 md:grid-cols-3">
              <CollectionInfoCard
                label="Selected collection"
                value={selectedBase.name}
                hint={`${documents.length} docs in this collection`}
              />
              <CollectionInfoCard
                label="Ready coverage"
                value={`${readyCount}/${documents.length || 0}`}
                hint="Ready docs can be cited by the bot"
              />
              <CollectionInfoCard
                label="Attention needed"
                value={String(failedCount)}
                hint={failedCount ? "Retry or replace failed files" : "No blocked files right now"}
                tone={failedCount ? "warning" : "default"}
              />
            </section>
          ) : null}

          <UploadZone loading={uploading} onFilesSelected={handleUpload} />

          {uploading ? (
            <div className="space-y-3 rounded-card border border-border bg-card p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : documents.length ? (
            <DocumentList
              documents={documents}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ) : (
            <EmptyState
              title="No documents uploaded"
              description="Upload PDF, DOCX, TXT, or Markdown files to start building searchable context for this collection."
              icon={<BookOpenText className="h-6 w-6" aria-hidden />}
              action={
                <div className="text-sm text-muted-foreground">
                  Try a pricing PDF, FAQ Markdown, or support playbook to preview retrieval coverage.
                </div>
              }
            />
          )}
        </main>
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
