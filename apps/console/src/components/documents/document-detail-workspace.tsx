"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Skeleton } from "@qiyun/ui";

import { ConsoleRequestError } from "@/components/console/console-request-error";
import { deleteDocument, downloadDocumentBlob } from "@/lib/documents/data";
import { CATEGORY_META, formatDateLabel, formatFileSize, KIND_LABEL } from "@/lib/documents/format";
import type { DocumentItem } from "@/lib/documents/types";
import { getDocumentFromApi } from "@/lib/documents/api";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface DocumentDetailWorkspaceProps {
  documentId: string;
}

export function DocumentDetailWorkspace({ documentId }: DocumentDetailWorkspaceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await getDocumentFromApi(documentId);
      setDocument(doc);
      if (!doc) setError("资料不存在、已删除或当前账号无权访问。");
    } catch {
      setError("资料详情加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDownload() {
    if (!document) return;
    setDownloading(true);
    try {
      const blob = await downloadDocumentBlob(document.id);
      triggerDownload(blob, document.name);
    } catch {
      setError("文件下载失败，请稍后重试。");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!document) return;
    setDeleting(true);
    try {
      await deleteDocument(document.id);
      router.push("/dashboard/knowledge-bases");
    } catch {
      setError("删除失败，请稍后重试。");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="py-4">
        <ConsoleRequestError message={error} onRetry={() => void load()} retryLabel="重新加载" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-4">
        <ConsoleRequestError message="资料不存在、已删除或当前账号无权访问。" onRetry={() => void load()} retryLabel="重新加载" />
      </div>
    );
  }

  const current = document;
  const category = CATEGORY_META[current.category];

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs text-foreground">{KIND_LABEL[current.kind]}</span>
            <span
              className="rounded-full px-3 py-1 text-xs text-white"
              style={{ backgroundColor: category.color }}
            >
              {category.label}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {current.status}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{current.name}</h1>
          <p className="text-sm text-muted-foreground">
            文件大小 {formatFileSize(current.sizeBytes)} · 上传时间 {formatDateLabel(current.uploadedAt)} · 上传人{" "}
            {current.uploadedBy}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/knowledge-bases"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
          >
            返回知识库
          </Link>
          <Button onClick={() => void handleDownload()} loading={downloading}>
            下载文件
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} loading={deleting}>
            删除文件
          </Button>
        </div>
      </div>

      {error ? <ConsoleRequestError message={error} onRetry={() => setError(null)} retryLabel="知道了" /> : null}

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">文件信息</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">文档 ID</dt>
              <dd className="font-mono text-xs text-foreground">{current.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">MIME 类型</dt>
              <dd className="text-foreground">{current.mimeType ?? "--"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">可加水印</dt>
              <dd className="text-foreground">{current.watermarkable ? "是" : "否"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">已生成水印</dt>
              <dd className="text-foreground">{current.watermarked ? "是" : "否"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">操作建议</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>1. 如果该资料用于问答，请确认内容已成功进入知识库并能被检索到。</p>
            <p>2. 如果回答总是“未找到依据”，优先检查解析结果、切片质量和向量化状态。</p>
            <p>3. 报价、交期、图纸类资料建议单独分类，方便机器人优先引用。</p>
          </div>
        </article>
      </section>
    </div>
  );
}
