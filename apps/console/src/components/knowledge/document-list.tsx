"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qiyun/ui";

import { DocumentStatusBadgeWithRetry } from "@/components/knowledge/document-status-badge";
import { formatDateTime, formatFileSize } from "@/lib/knowledge/format";
import type { KnowledgeDocument } from "@/lib/knowledge/types";

export interface DocumentListProps {
  documents: KnowledgeDocument[];
  onRetry: (documentId: string) => void;
  onDelete: (documentId: string) => void;
}

export function DocumentList({
  documents,
  onRetry,
  onDelete,
}: DocumentListProps) {
  return (
    <>
      <div className="hidden rounded-card border border-border bg-card shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="max-w-[240px] truncate font-medium">
                  {document.fileName}
                </TableCell>
                <TableCell>{document.fileType}</TableCell>
                <TableCell>{formatFileSize(document.sizeBytes)}</TableCell>
                <TableCell>
                  <DocumentStatusBadgeWithRetry
                    status={document.status}
                    errorMessage={document.errorMessage}
                    onRetry={() => onRetry(document.id)}
                  />
                </TableCell>
                <TableCell>{document.chunkCount ?? "-"}</TableCell>
                <TableCell>{formatDateTime(document.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <DocumentActions documentId={document.id} onDelete={onDelete} />
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-foreground">
                  {document.fileName}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {document.fileType} · {formatFileSize(document.sizeBytes)}
                </p>
              </div>
              <DocumentActions documentId={document.id} onDelete={onDelete} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <DocumentStatusBadgeWithRetry
                status={document.status}
                errorMessage={document.errorMessage}
                onRetry={() => onRetry(document.id)}
              />
              <span>Chunks {document.chunkCount ?? "-"}</span>
              <span>{formatDateTime(document.updatedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function DocumentActions({
  documentId,
  onDelete,
}: {
  documentId: string;
  onDelete: (documentId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Document actions">
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(documentId)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
