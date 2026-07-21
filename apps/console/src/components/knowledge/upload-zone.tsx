"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { FileText, FileUp, Loader2, Upload, X } from "lucide-react";

import { Alert, Button } from "@qiyun/ui";

import { ALLOWED_EXTENSIONS } from "@/lib/knowledge/constants";
import { formatFileSize } from "@/lib/knowledge/format";
import { validateKnowledgeFile } from "@/lib/knowledge/validation";

export interface UploadZoneProps {
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  onFilesSelected: (files: File[]) => void;
}

export interface UploadZoneHandle {
  openFilePicker: () => void;
  uploadStaged: () => void;
  stagedCount: number;
}

export const UploadZone = forwardRef<UploadZoneHandle, UploadZoneProps>(function UploadZone(
  { disabled = false, disabledReason, loading = false, onFilesSelected },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  function stageFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled || loading) return;

    const files = Array.from(fileList);
    const firstError = files.map(validateKnowledgeFile).find(Boolean);

    if (firstError) {
      setError(firstError);
      return;
    }

    setError(null);
    setStagedFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}:${file.size}`));
      const next = [...current];

      for (const file of files) {
        const key = `${file.name}:${file.size}`;
        if (!existing.has(key)) {
          next.push(file);
        }
      }

      return next;
    });
  }

  function removeStagedFile(index: number) {
    setStagedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  const handleUpload = useCallback(() => {
    if (!stagedFiles.length || disabled || loading) return;
    onFilesSelected(stagedFiles);
    setStagedFiles([]);
  }, [disabled, loading, onFilesSelected, stagedFiles]);

  useImperativeHandle(
    ref,
    () => ({
      openFilePicker: () => {
        if (disabled || loading) return;
        inputRef.current?.click();
      },
      uploadStaged: () => handleUpload(),
      get stagedCount() {
        return stagedFiles.length;
      },
    }),
    [disabled, handleUpload, loading, stagedFiles],
  );

  const blocked = disabled || loading;

  return (
    <section className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-foreground">上传文档</h2>
        <p className="text-sm text-muted-foreground">
          支持 {ALLOWED_EXTENSIONS.join("、")}，单文件不超过 20 MB。上传后会进入解析与索引流程。
        </p>
      </div>

      {disabled && disabledReason ? (
        <Alert variant="info" title="当前无法上传">
          {disabledReason}
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" title="文件校验失败">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Alert variant="info" title="正在上传">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            文件正在上传，请稍候…
          </span>
        </Alert>
      ) : null}

      <div
        className={`relative rounded-card border-2 border-dashed p-6 transition-colors sm:p-8 ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-background/50"
        } ${blocked ? "opacity-60" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!blocked) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!blocked) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          stageFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">拖拽文件到此处，或从电脑选择</p>
            <p className="text-xs text-muted-foreground">
              也可点击下方按钮浏览文件，支持一次选择多个文档
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={blocked}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" aria-hidden />
            选择文件
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            disabled={blocked}
            onChange={(event) => {
              stageFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {stagedFiles.length ? (
        <div className="space-y-3 rounded-control border border-border/70 bg-background/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">待上传 {stagedFiles.length} 个文件</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setStagedFiles([])}
              disabled={loading}
            >
              清空
            </Button>
          </div>
          <ul className="space-y-2">
            {stagedFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-control border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`移除 ${file.name}`}
                  onClick={() => removeStagedFile(index)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="w-full sm:w-auto"
            loading={loading}
            disabled={blocked}
            onClick={handleUpload}
          >
            开始上传
          </Button>
        </div>
      ) : null}
    </section>
  );
});
