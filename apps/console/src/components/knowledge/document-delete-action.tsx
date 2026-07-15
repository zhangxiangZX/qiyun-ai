"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Badge, Button, ConfirmDialog } from "@qiyun/ui";

import { apiMutate, isPreviewModeError } from "@/lib/api/use-api-resource";
import type { KnowledgeDocument } from "@/lib/knowledge/types";

export interface DocumentDeleteActionProps {
  document: KnowledgeDocument;
  available: boolean;
  unavailableHint: string;
  deleting?: boolean;
  onConfirmDelete?: (documentId: string) => void | Promise<void>;
  compact?: boolean;
}

export function DocumentDeleteAction({
  document,
  available,
  unavailableHint,
  deleting = false,
  onConfirmDelete,
  compact = false,
}: DocumentDeleteActionProps) {
  const [open, setOpen] = useState(false);
  const [previewHint, setPreviewHint] = useState(false);

  const inProgress =
    document.status === "uploaded" ||
    document.status === "parsing" ||
    document.status === "indexing";

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-1"}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
          disabled={!available || deleting || inProgress}
          title={
            inProgress
              ? "文档处理中，请稍后再试"
              : available
                ? "删除文档及其索引"
                : unavailableHint
          }
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          删除
        </Button>
        {!available ? (
          <Badge variant="outline" className="text-[10px]">
            Preview 不可用
          </Badge>
        ) : null}
        {previewHint ? (
          <Badge variant="outline" className="text-[10px]">
            预览模式：操作未同步
          </Badge>
        ) : null}
      </div>

      <ConfirmDialog
        open={open}
        title="确认删除文档"
        description={
          available
            ? `将删除「${document.fileName}」及其向量索引，机器人将无法再引用此文件。此操作不可撤销。`
            : `「${document.fileName}」${unavailableHint}`
        }
        confirmLabel={available ? "确认删除" : "知道了"}
        cancelLabel={available ? "取消" : "关闭"}
        destructive={available}
        confirmLoading={deleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          if (available) {
            try {
              await apiMutate(`/documents/${document.id}`, "DELETE");
              onConfirmDelete?.(document.id);
            } catch (err: unknown) {
              if (isPreviewModeError(err)) {
                setPreviewHint(true);
              }
            }
            setOpen(false);
          } else {
            setOpen(false);
          }
        }}
      />
    </>
  );
}
