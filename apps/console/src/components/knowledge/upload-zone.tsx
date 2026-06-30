"use client";

import { useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";

import { Alert, Button } from "@qiyun/ui";

import { ALLOWED_EXTENSIONS } from "@/lib/knowledge/constants";
import { validateKnowledgeFile } from "@/lib/knowledge/validation";

export interface UploadZoneProps {
  disabled?: boolean;
  loading?: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function UploadZone({
  disabled = false,
  loading = false,
  onFilesSelected,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled || loading) return;

    const files = Array.from(fileList);
    const firstError = files.map(validateKnowledgeFile).find(Boolean);

    if (firstError) {
      setError(firstError);
      return;
    }

    setError(null);
    onFilesSelected(files);
  }

  return (
    <div className="space-y-3">
      {error ? <Alert variant="error" title={error} /> : null}

      <div
        className={`rounded-card border-2 border-dashed p-6 transition-colors sm:p-8 ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-card"
        } ${disabled || loading ? "opacity-60" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !loading) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !loading) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Drop files here or choose from your computer
            </p>
            <p className="text-xs text-muted-foreground">
              Supports {ALLOWED_EXTENSIONS.join(", ")} files up to 20 MB each
            </p>
            <p className="text-xs text-muted-foreground">
              Demo tip: include <span className="font-medium text-foreground">fail</span> in a
              file name to simulate a parsing error.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            loading={loading}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" aria-hidden />
            Select files
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            disabled={disabled || loading}
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
