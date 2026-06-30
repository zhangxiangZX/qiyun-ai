"use client";

import { useState } from "react";

import { Button, Input, Label } from "@qiyun/ui";

export interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateKnowledgeBaseDialog({
  open,
  loading = false,
  onClose,
  onCreate,
}: CreateKnowledgeBaseDialogProps) {
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
        <h2 className="text-lg font-semibold text-card-foreground">
          Create knowledge base
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Group related documents so bots can retrieve the right context.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="kb-name">Name</Label>
          <Input
            id="kb-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Product support docs"
            disabled={loading}
            required
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
