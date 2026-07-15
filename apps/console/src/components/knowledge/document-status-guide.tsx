"use client";

import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";

import { Badge } from "@qiyun/ui";

import {
  DOCUMENT_PIPELINE_STEPS,
  type DocumentPipelineStep,
} from "@/lib/knowledge/status-labels";

const STEP_ICONS: Record<DocumentPipelineStep, typeof Upload> = {
  uploading: Upload,
  parsing: Loader2,
  indexing: Loader2,
  ready: CheckCircle2,
  failed: AlertCircle,
};

export interface DocumentStatusGuideProps {
  pipelineHint?: string;
}

export function DocumentStatusGuide({ pipelineHint }: DocumentStatusGuideProps) {
  return (
    <section
      className="rounded-card border border-border/80 bg-card p-4 shadow-card"
      aria-label="文档处理状态说明"
    >
      <p className="text-sm font-medium text-foreground">文档处理流程</p>
      <p className="mt-1 text-xs text-muted-foreground">
        上传后会依次经过以下阶段；列表将自动刷新状态。
        {pipelineHint ? ` ${pipelineHint}` : ""}
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {DOCUMENT_PIPELINE_STEPS.map((step, index) => {
          const Icon = STEP_ICONS[step.key];
          const spinning = step.key === "parsing" || step.key === "indexing";

          return (
            <li
              key={step.key}
              className="rounded-control border border-border/70 bg-background/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Badge variant={step.badgeVariant} className="shrink-0">
                  {index + 1}
                </Badge>
                <Icon
                  className={`h-3.5 w-3.5 text-muted-foreground ${spinning ? "animate-spin" : ""}`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-foreground">{step.label}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
