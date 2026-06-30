"use client";

import { useState } from "react";

import { Button, Input, Label } from "@qiyun/ui";

export interface CreateBotDialogProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateBotDialog({
  open,
  loading = false,
  onClose,
  onCreate,
}: CreateBotDialogProps) {
  const [name, setName] = useState("");

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-dialog border border-border bg-card p-6 shadow-card"
      >
        <h2 className="text-lg font-semibold text-card-foreground">新建机器人</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          创建后可配置知识库、行为规则与嵌入代码。
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bot-name">名称</Label>
          <Input
            id="bot-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="官网客服"
            disabled={loading}
            required
          />
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
