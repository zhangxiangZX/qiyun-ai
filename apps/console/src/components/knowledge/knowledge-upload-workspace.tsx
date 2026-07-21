"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  RefreshCw,
  Star,
} from "lucide-react";

import { Badge, Button, PageHeader } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { UploadZone, type UploadZoneHandle } from "@/components/knowledge/upload-zone";
import { listKnowledgeBases, uploadDocumentFiles } from "@/lib/knowledge/api";
import { formatFileSize } from "@/lib/knowledge/format";
import type { KnowledgeDocument } from "@/lib/knowledge/types";
import {
  uploadParseSummary,
  uploadQualityScores,
  type UploadFileRow,
} from "@/lib/knowledge/upload-mock-data";

const FORMATS = [
  { label: "PDF", icon: FileText, tone: "text-red-500" },
  { label: "DOCX", icon: FileType, tone: "text-blue-500" },
  { label: "PPTX", icon: Presentation, tone: "text-orange-500" },
  { label: "XLSX", icon: FileSpreadsheet, tone: "text-emerald-500" },
  { label: "TXT", icon: FileText, tone: "text-slate-500" },
  { label: "MD", icon: FileCode2, tone: "text-violet-500" },
  { label: "HTML", icon: FileCode2, tone: "text-cyan-500" },
];

function FileTypeBadge({ type }: { type: UploadFileRow["fileType"] }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
      {type}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < Math.floor(score)
              ? "fill-amber-400 text-amber-400"
              : index < score
                ? "fill-amber-200 text-amber-400"
                : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function ParseRing({ rate }: { rate: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  return (
    <div className="relative mx-auto h-28 w-28">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-foreground">{rate}%</span>
        <span className="text-xs text-muted-foreground">解析完成率</span>
      </div>
    </div>
  );
}

function mapDocumentToRow(doc: KnowledgeDocument): UploadFileRow {
  const ext = doc.fileType.replace(".", "").toLowerCase();
  const fileType = (["pdf", "docx", "pptx", "xlsx", "txt", "md", "html"].includes(ext)
    ? ext
    : "pdf") as UploadFileRow["fileType"];
  const status =
    doc.status === "ready"
      ? "completed"
      : doc.status === "failed"
        ? "failed"
        : doc.status === "uploaded"
          ? "uploading"
          : "parsing";
  const statusLabel =
    doc.status === "ready"
      ? "已完成"
      : doc.status === "failed"
        ? "失败"
        : doc.status === "uploaded"
          ? "已上传"
          : "解析中";
  return {
    id: doc.id,
    fileName: doc.fileName,
    fileType,
    size: formatFileSize(doc.sizeBytes),
    uploadProgress: doc.status === "ready" ? 100 : doc.status === "uploaded" ? 100 : 65,
    status,
    statusLabel,
    extractedSummary:
      doc.chunkCount != null ? `${doc.chunkCount} 个文本块` : doc.errorMessage ?? "等待解析",
  };
}

export function KnowledgeUploadWorkspace() {
  const [files, setFiles] = useState<UploadFileRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [category, setCategory] = useState("产品文档");
  const [name, setName] = useState("产品手册与解决方案");
  const [language, setLanguage] = useState("zh-CN");
  const [description, setDescription] = useState(
    "收录产品手册、解决方案与客户常见问答，供官网 Widget 与选型助手检索。",
  );
  const [parseMode, setParseMode] = useState<"smart" | "fast" | "custom">("smart");
  const [tags, setTags] = useState(["产品文档", "解决方案", "使用指南", "技术文档"]);
  const [selectedBaseId, setSelectedBaseId] = useState("");
  const uploadZoneRef = useRef<UploadZoneHandle>(null);

  const loadBases = useCallback(async () => {
    try {
      const bases = await listKnowledgeBases();
      setSelectedBaseId(bases[0]?.id ?? "");
    } catch {
      setSelectedBaseId("");
    }
  }, []);

  useEffect(() => {
    void loadBases();
  }, [loadBases]);

  const handleUpload = useCallback(
    async (selected: File[]) => {
      if (!selectedBaseId || !selected.length) return;
      setUploading(true);
      setUploadError(null);
      try {
        const uploaded = await uploadDocumentFiles(selectedBaseId, selected);
        setFiles((current) => [...uploaded.map(mapDocumentToRow), ...current]);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "上传失败，请稍后重试。");
      } finally {
        setUploading(false);
      }
    },
    [selectedBaseId],
  );

  const summary = useMemo(() => {
    if (!files.length) return uploadParseSummary;
    const parsed = files.filter((file) => file.status === "completed").length;
    const parsing = files.filter((file) => file.status === "parsing" || file.status === "uploading").length;
    const queued = files.filter((file) => file.status === "queued").length;
    const completionRate = files.length ? Math.round((parsed / files.length) * 100) : 0;
    return {
      ...uploadParseSummary,
      total: files.length,
      parsed,
      parsing,
      queued,
      completionRate,
    };
  }, [files]);
  const quality = uploadQualityScores;

  return (
    <ConsolePage>
      <PageHeader
        title="知识库上传"
        description="上传产品手册、方案与 FAQ，配置解析规则后供 AI 助手检索引用。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={!selectedBaseId || uploading}
              onClick={() => uploadZoneRef.current?.openFilePicker()}
            >
              选择文件
            </Button>
            <Button
              size="sm"
              type="button"
              loading={uploading}
              disabled={!selectedBaseId || uploading}
              onClick={() => {
                const zone = uploadZoneRef.current;
                if (!zone) return;
                if (zone.stagedCount > 0) {
                  zone.uploadStaged();
                  return;
                }
                zone.openFilePicker();
              }}
            >
              开始上传
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="知识库上传" />
        {uploadError ? <ConsoleRequestError message={uploadError} /> : null}
      </ConsolePageAlerts>

      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">上传文件</h2>
            <UploadZone
              ref={uploadZoneRef}
              loading={uploading}
              disabled={!selectedBaseId}
              disabledReason={!selectedBaseId ? "请先创建知识库后再上传文档。" : undefined}
              onFilesSelected={(selected) => void handleUpload(selected)}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              支持批量上传，单个文件最大 200MB
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {FORMATS.map((format) => (
                <span key={format.label} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <format.icon className={`h-3.5 w-3.5 ${format.tone}`} />
                  {format.label}
                </span>
              ))}
            </div>
            {!selectedBaseId ? (
              <p className="mt-3 text-center text-xs text-amber-600">
                尚未连接知识库 API，当前展示上传预览界面。
                <Link href="/dashboard/knowledge-bases" className="ml-1 underline">
                  前往知识库
                </Link>
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">知识库设置</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">知识库分类</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option>产品文档</option>
                  <option>解决方案</option>
                  <option>客户案例</option>
                  <option>售后服务</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">知识库名称</span>
                <input
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">语言</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">标签</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">知识库描述</span>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm text-muted-foreground">解析设置</legend>
                {[
                  { key: "smart" as const, title: "智能解析（推荐）", desc: "自动识别文档结构" },
                  { key: "fast" as const, title: "快速解析", desc: "仅提取纯文本" },
                  { key: "custom" as const, title: "自定义解析", desc: "手动配置分段规则" },
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                      parseMode === option.key ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="parseMode"
                      checked={parseMode === option.key}
                      onChange={() => setParseMode(option.key)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{option.title}</span>
                      <span className="text-xs text-muted-foreground">{option.desc}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">AI 解析摘要</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <ParseRing rate={summary.completionRate} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/40 py-2">
                <div className="font-semibold text-foreground">{summary.total}</div>
                <div className="text-muted-foreground">总文件</div>
              </div>
              <div className="rounded-lg bg-muted/40 py-2">
                <div className="font-semibold text-foreground">{summary.parsed}</div>
                <div className="text-muted-foreground">已解析</div>
              </div>
              <div className="rounded-lg bg-muted/40 py-2">
                <div className="font-semibold text-foreground">{summary.parsing}</div>
                <div className="text-muted-foreground">解析中</div>
              </div>
              <div className="rounded-lg bg-muted/40 py-2">
                <div className="font-semibold text-foreground">{summary.queued}</div>
                <div className="text-muted-foreground">待解析</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {[
                { label: "文本块", value: summary.textBlocks },
                { label: "表格", value: summary.tables },
                { label: "图片", value: summary.images },
                { label: "代码块", value: summary.codeBlocks },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/70 px-3 py-2">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="font-semibold text-foreground">{item.value.toLocaleString("zh-CN")}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">文件上传列表</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">文件名称</th>
                    <th className="px-4 py-3 font-medium">大小</th>
                    <th className="px-4 py-3 font-medium">上传进度</th>
                    <th className="px-4 py-3 font-medium">解析状态</th>
                    <th className="px-4 py-3 font-medium">提取内容</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileTypeBadge type={file.fileType} />
                          <span className="font-medium text-foreground">{file.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{file.size}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-[120px] space-y-1">
                          <ProgressBar value={file.uploadProgress} />
                          <span className="text-xs text-muted-foreground">{file.uploadProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={file.status === "completed" ? "success" : "secondary"}
                        >
                          {file.statusLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{file.extractedSummary}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" type="button">
                          {file.status === "uploading" || file.status === "parsing" ? "取消" : "详情"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>共 {files.length} 条</span>
              <span>10 条/页</span>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">知识库质量评估</h2>
            <div className="space-y-4">
              {[
                { label: "内容覆盖度", score: quality.coverage.score, hint: quality.coverage.label },
                { label: "结构完整性", score: quality.structure.score, hint: quality.structure.label },
                { label: "内容可读性", score: quality.readability.score, hint: quality.readability.label },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating score={item.score} />
                    <span className="text-sm font-medium text-foreground">{item.score}</span>
                  </div>
                </div>
              ))}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">重复内容占比</span>
                  <span className="text-xs text-emerald-600">{quality.duplicateLabel}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={quality.duplicateRate} />
                  <span className="mt-1 block text-xs text-muted-foreground">{quality.duplicateRate}%</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                {quality.suggestion}
              </div>
              <Button variant="outline" size="sm" className="w-full" type="button">
                去优化
              </Button>
            </div>
          </section>
        </div>
      </div>
    </ConsolePage>
  );
}
