"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Input, Label, useFocusTrap } from "@qiyun/ui";

export interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateKnowledgeBaseDialog({
  open,
  loading = false,
  error = null,
  onClose,
  onCreate,
}: CreateKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      setName("");
    }
  }, [open]);

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

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        ref={containerRef}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-dialog border border-border bg-card p-6 shadow-card"
        role="dialog"
        aria-modal="true"
        aria-label="创建知识库"
      >
        <h2 className="text-lg font-semibold text-card-foreground">
          创建知识库
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          将相关文档分组，便于机器人检索正确上下文。
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="kb-name">名称</Label>
          <Input
            id="kb-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="产品支持文档"
            disabled={loading}
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button type="submit" loading={loading}>
            创建
          </Button>
        </div>
      </form>
    </div>
  );
}
