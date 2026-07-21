"use client";

import { DocumentPipelineStepper } from "@/components/knowledge/document-pipeline-stepper";
import { DocumentDeleteAction } from "@/components/knowledge/document-delete-action";
import { DocumentFailurePanel } from "@/components/knowledge/document-failure-panel";
import {
  DocumentChunkMeta,
  DocumentFileMeta,
  DocumentStatusChip,
  DocumentStatusHint,
  DocumentUpdatedMeta,
} from "@/components/knowledge/document-meta";
import { DocumentStatusBadgeWithRetry } from "@/components/knowledge/document-status-badge";
import type { KnowledgeDocument } from "@/lib/knowledge/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@qiyun/ui";
import { RefreshCw, Layers3 } from "lucide-react";

export interface DocumentListProps {
  documents: KnowledgeDocument[];
  onRetry: (documentId: string) => void;
  onReparse?: (documentId: string) => void;
  onPreviewChunks?: (documentId: string, fileName: string) => void;
  onDelete?: (documentId: string) => void;
  documentDeleteAvailable?: boolean;
  documentDeleteHint?: string;
  deletingDocumentId?: string | null;
  reprocessingDocumentId?: string | null;
  loading?: boolean;
}

export function DocumentList({
  documents,
  onRetry,
  onReparse,
  onPreviewChunks,
  onDelete,
  documentDeleteAvailable = false,
  documentDeleteHint = "单文档删除尚未接通。",
  deletingDocumentId = null,
  reprocessingDocumentId = null,
  loading = false,
}: DocumentListProps) {
  if (!loading && !documents.length) {
    return null;
  }

  return (
    <>
      <div className="hidden rounded-card border border-border bg-card shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%]">文件</TableHead>
              <TableHead className="w-[22%]">处理进度</TableHead>
              <TableHead className="w-[12%]">状态</TableHead>
              <TableHead className="w-[8%]">切分块</TableHead>
              <TableHead className="w-[20%]">更新时间</TableHead>
              <TableHead className="w-[14%]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} className="align-top">
                <TableCell>
                  <DocumentFileMeta document={document} />
                </TableCell>
                <TableCell>
                  <DocumentPipelineStepper status={document.status} compact />
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <DocumentStatusBadgeWithRetry
                      status={document.status}
                      showInlineError={false}
                      onRetry={
                        document.status === "failed"
                          ? () => onRetry(document.id)
                          : undefined
                      }
                    />
                    <DocumentStatusChip status={document.status} />
                    <DocumentStatusHint
                      status={document.status}
                      errorCode={document.errorCode}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <DocumentChunkMeta
                    chunkCount={document.chunkCount}
                    status={document.status}
                  />
                </TableCell>
                <TableCell>
                  <DocumentUpdatedMeta updatedAt={document.updatedAt} />
                  {document.status === "failed" ? (
                    <div className="mt-3 max-w-sm">
                      <DocumentFailurePanel
                        errorCode={document.errorCode}
                        errorMessage={document.errorMessage}
                        fileType={document.fileType}
                        onRetry={() => onRetry(document.id)}
                        compact
                      />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    {document.status === "ready" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 w-fit gap-1.5"
                        onClick={() => onPreviewChunks?.(document.id, document.fileName)}
                      >
                        <Layers3 className="h-3.5 w-3.5" aria-hidden />
                        查看切分块
                      </Button>
                    ) : null}
                    {document.status === "ready" || document.status === "failed" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 w-fit gap-1.5"
                          disabled={reprocessingDocumentId === document.id}
                          onClick={() => onRetry(document.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                          重试索引
                        </Button>
                        {onReparse ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 w-fit gap-1.5"
                            disabled={reprocessingDocumentId === document.id}
                            onClick={() => onReparse(document.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                            重新解析
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                    <DocumentDeleteAction
                    document={document}
                    available={documentDeleteAvailable}
                    unavailableHint={documentDeleteHint}
                    deleting={deletingDocumentId === document.id}
                    onConfirmDelete={onDelete}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {documents.map((document) => (
          <article
            key={document.id}
            className="rounded-card border border-border bg-card p-4 shadow-card"
          >
            <DocumentFileMeta document={document} />
            <div className="mt-4">
              <DocumentPipelineStepper status={document.status} compact />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DocumentStatusBadgeWithRetry
                status={document.status}
                showInlineError={false}
                onRetry={
                  document.status === "failed" ? () => onRetry(document.id) : undefined
                }
              />
              <DocumentStatusChip status={document.status} />
            </div>
            <div className="mt-2">
              <DocumentStatusHint
                status={document.status}
                errorCode={document.errorCode}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <DocumentChunkMeta chunkCount={document.chunkCount} status={document.status} />
              <DocumentUpdatedMeta updatedAt={document.updatedAt} />
            </div>
            {document.status === "failed" ? (
              <div className="mt-3">
                <DocumentFailurePanel
                  errorCode={document.errorCode}
                  errorMessage={document.errorMessage}
                  fileType={document.fileType}
                  onRetry={() => onRetry(document.id)}
                />
              </div>
            ) : null}
            {document.status === "ready" || document.status === "failed" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {document.status === "ready" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-1.5"
                    onClick={() => onPreviewChunks?.(document.id, document.fileName)}
                  >
                    <Layers3 className="h-3.5 w-3.5" aria-hidden />
                    查看切分块
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1.5"
                  disabled={reprocessingDocumentId === document.id}
                  onClick={() => onRetry(document.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  重试索引
                </Button>
                {onReparse ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-1.5"
                    disabled={reprocessingDocumentId === document.id}
                    onClick={() => onReparse(document.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    重新解析
                  </Button>
                ) : null}
              </div>
            ) : null}
            <DocumentDeleteAction
              document={document}
              available={documentDeleteAvailable}
              unavailableHint={documentDeleteHint}
              deleting={deletingDocumentId === document.id}
              onConfirmDelete={onDelete}
            />
          </article>
        ))}
      </div>
    </>
  );
}
