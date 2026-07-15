"use client";

import {
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  File as FileIcon,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@qiyun/ui";
import {
  CATEGORY_META,
  KIND_LABEL,
  formatDateLabel,
  formatFileSize,
} from "@/lib/documents/format";
import type { DocumentItem, DocumentKind } from "@/lib/documents/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import styles from "@/styles/documents.module.css";

const KIND_ICON: Record<DocumentKind, typeof FileText> = {
  pdf: FileText,
  image: FileImage,
  doc: FileType,
  sheet: FileSpreadsheet,
  other: FileIcon,
};

const KIND_COLOR: Record<DocumentKind, string> = {
  pdf: "#ef4444",
  image: "#0ea5e9",
  doc: "#3b5eff",
  sheet: "#22c55e",
  other: "#64748b",
};

export interface DocumentListProps {
  documents: DocumentItem[];
  downloadingId: string | null;
  watermarkingId: string | null;
  onDownload: (doc: DocumentItem) => void;
  onWatermark: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

export function DocumentList({
  documents,
  downloadingId,
  watermarkingId,
  onDownload,
  onWatermark,
  onDelete,
}: DocumentListProps) {
  if (documents.length === 0) {
    return <p className={styles.emptyHint}>{t(defaultLocale, "documents.empty")}</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t(defaultLocale, "documents.col.name")}</th>
            <th>{t(defaultLocale, "documents.col.category")}</th>
            <th>{t(defaultLocale, "documents.col.size")}</th>
            <th>{t(defaultLocale, "documents.col.uploaded")}</th>
            <th>{t(defaultLocale, "documents.col.watermark")}</th>
            <th style={{ textAlign: "right" }}>
              {t(defaultLocale, "documents.col.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const Icon = KIND_ICON[doc.kind];
            const cat = CATEGORY_META[doc.category];
            const isDownloading = downloadingId === doc.id;
            const isWatermarking = watermarkingId === doc.id;
            return (
              <tr key={doc.id}>
                <td>
                  <div className={styles.docCell}>
                    <span
                      className={styles.docIcon}
                      style={{ backgroundColor: KIND_COLOR[doc.kind] }}
                    >
                      <Icon size={18} aria-hidden />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.docName}>{doc.name}</div>
                      <div className={styles.docMeta}>
                        {KIND_LABEL[doc.kind]} · {doc.uploadedBy}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={styles.catTag}
                    style={{ color: cat.color, backgroundColor: `${cat.color}1f` }}
                  >
                    {cat.label}
                  </span>
                </td>
                <td>{formatFileSize(doc.sizeBytes)}</td>
                <td>{formatDateLabel(doc.uploadedAt)}</td>
                <td>
                  {doc.watermarkable ? (
                    <span className={`${styles.wmTag} ${doc.watermarked ? styles.wmOn : ""}`}>
                      <ShieldCheck size={13} aria-hidden />
                      {doc.watermarked
                        ? t(defaultLocale, "documents.wmDone")
                        : t(defaultLocale, "documents.wmAvailable")}
                    </span>
                  ) : (
                    <span className={styles.wmTag}>
                      {t(defaultLocale, "documents.wmNone")}
                    </span>
                  )}
                </td>
                <td>
                  <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isDownloading}
                      onClick={() => onDownload(doc)}
                    >
                      {!isDownloading ? <Download size={14} aria-hidden /> : null}
                      {t(defaultLocale, "documents.download")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isWatermarking}
                      disabled={!doc.watermarkable}
                      onClick={() => onWatermark(doc)}
                    >
                      {!isWatermarking ? <ShieldCheck size={14} aria-hidden /> : null}
                      {t(defaultLocale, "documents.watermark")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t(defaultLocale, "documents.delete")}
                      onClick={() => onDelete(doc)}
                    >
                      <Trash2 size={15} aria-hidden />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
