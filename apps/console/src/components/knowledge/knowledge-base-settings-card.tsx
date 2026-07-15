"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Alert, Badge, Button, ConfirmDialog, Input, Label } from "@qiyun/ui";

import {
  getKnowledgeBaseStatusBadgeVariant,
  KNOWLEDGE_BASE_STATUS_LABELS,
} from "@/lib/knowledge/status-labels";
import type { KnowledgeBase } from "@/lib/knowledge/types";

export interface KnowledgeBaseSettingsCardProps {
  knowledgeBase: KnowledgeBase;
  saving?: boolean;
  deleting?: boolean;
  saveError?: string | null;
  onSaveName: (name: string) => void;
  onToggleStatus: (status: "active" | "disabled") => void;
  onDelete: () => void;
}

export function KnowledgeBaseSettingsCard({
  knowledgeBase,
  saving = false,
  deleting = false,
  saveError = null,
  onSaveName,
  onToggleStatus,
  onDelete,
}: KnowledgeBaseSettingsCardProps) {
  const [name, setName] = useState(knowledgeBase.name);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setName(knowledgeBase.name);
  }, [knowledgeBase.id, knowledgeBase.name]);

  const nameChanged = name.trim() !== knowledgeBase.name;
  const statusVariant = getKnowledgeBaseStatusBadgeVariant(knowledgeBase.status);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !nameChanged) return;
    onSaveName(trimmed);
  }

  return (
    <>
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">知识库设置</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              重命名、暂停检索，或删除此知识库。
            </p>
          </div>
          <Badge variant={statusVariant}>
            {KNOWLEDGE_BASE_STATUS_LABELS[knowledgeBase.status]}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kb-settings-name">名称</Label>
            <Input
              id="kb-settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving || deleting}
              required
            />
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving} disabled={!nameChanged || deleting}>
              保存名称
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={saving}
              disabled={deleting}
              onClick={() =>
                onToggleStatus(knowledgeBase.status === "active" ? "disabled" : "active")
              }
            >
              {knowledgeBase.status === "active" ? "停用知识库" : "启用知识库"}
            </Button>
          </div>
        </form>

        {knowledgeBase.status === "disabled" ? (
          <Alert
            variant="warning"
            title="知识库已停用"
            className="mt-4"
          >
            已禁止上传新文档，机器人也不会从此知识库检索内容，启用后可恢复正常。
          </Alert>
        ) : null}

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-sm font-medium text-card-foreground">危险操作</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            删除后将移除此知识库，并软删除其中的 {knowledgeBase.documentCount}{" "}
            个文档。此操作在控制台内不可撤销。
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-4"
            loading={deleting}
            disabled={saving}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            删除知识库
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="确认删除知识库？"
        description={`「${knowledgeBase.name}」及其文档将从工作区视图中移除。`}
        confirmLabel="删除"
        cancelLabel="取消"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete();
        }}
      />
    </>
  );
}
