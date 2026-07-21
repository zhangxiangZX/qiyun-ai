"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, Upload, X } from "lucide-react";

import { Button, Label, Select, useFocusTrap } from "@qiyun/ui";
import { CATEGORY_META, formatFileSize } from "@/lib/documents/format";
import type { DocumentCategory } from "@/lib/documents/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface UploadDocumentDialogProps {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onUpload: (file: File, category: DocumentCategory) => void;
}

const CATEGORIES = Object.keys(CATEGORY_META) as DocumentCategory[];

export function UploadDocumentDialog({
  open,
  loading = false,
  error = null,
  onClose,
  onUpload,
}: UploadDocumentDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [staged, setStaged] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("brochure");

  // Focus trap: Tab cycling + ESC close + auto-focus + focus restore
  useFocusTrap(containerRef, { active: open, onEscape: onClose });

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function stageFile(fileList: FileList | null) {
    if (!fileList?.length || loading) return;
    const next = fileList[0];
    setStaged(next);
    // 选完文件后直接进入上传，避免「选了但没点上传」
    onUpload(next, category);
  }

  function handleUpload() {
    if (!staged || loading) return;
    onUpload(staged, category);
  }

  return createPortal(
    <div
      data-dialog-overlay=""
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg rounded-dialog border border-border bg-card p-6 shadow-card opacity-100"
        role="dialog"
        aria-modal="true"
        aria-label={t(defaultLocale, "documents.uploadTitle")}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-card-foreground">
            {t(defaultLocale, "documents.uploadTitle")}
          </h2>
          <button
            type="button"
            className="rounded-control p-1 text-muted-foreground hover:bg-muted"
            aria-label={t(defaultLocale, "documents.close")}
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(defaultLocale, "documents.uploadHint")}
        </p>

        {error ? (
          <p className="mt-3 rounded-control border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div
          className={`mt-4 rounded-card border-2 border-dashed p-6 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border bg-background/50"
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!loading) setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!loading) setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            stageFile(e.dataTransfer.files);
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload size={20} aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">拖拽文件到此处，或点击选择</p>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => inputRef.current?.click()}
            >
              <FileUp size={15} aria-hidden />
              {t(defaultLocale, "documents.chooseFile")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              disabled={loading}
              onChange={(e) => {
                stageFile(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {staged ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-control border border-border/60 px-3 py-2 text-sm">
            <span className="truncate font-medium text-foreground">{staged.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(staged.size)}
            </span>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <Label htmlFor="doc-category">{t(defaultLocale, "documents.category")}</Label>
          <Select
            id="doc-category"
            value={category}
            disabled={loading}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          >
            {CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_META[key].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t(defaultLocale, "documents.cancel")}
          </Button>
          <Button type="button" onClick={handleUpload} disabled={!staged || loading}>
            {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
            {t(defaultLocale, "documents.startUpload")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
