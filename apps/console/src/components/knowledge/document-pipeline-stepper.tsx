"use client";

import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";

import { cn } from "@qiyun/ui";

import {
  DOCUMENT_PIPELINE_STEPS,
  mapDocumentStatusToPipeline,
  type DocumentPipelineStep,
} from "@/lib/knowledge/status-labels";
import type { DocumentStatus } from "@/lib/knowledge/types";

const STEP_ORDER: DocumentPipelineStep[] = ["uploading", "parsing", "indexing", "ready"];

const STEP_ICONS: Record<DocumentPipelineStep, typeof Upload> = {
  uploading: Upload,
  parsing: Loader2,
  indexing: Loader2,
  ready: CheckCircle2,
  failed: AlertCircle,
};

function stepIndex(step: DocumentPipelineStep): number {
  if (step === "failed") return STEP_ORDER.length;
  return STEP_ORDER.indexOf(step);
}

export function DocumentPipelineStepper({
  status,
  compact = false,
}: {
  status: DocumentStatus;
  compact?: boolean;
}) {
  const current = mapDocumentStatusToPipeline(status);
  const currentIndex = stepIndex(current);
  const failed = current === "failed";

  return (
    <div
      className={cn("w-full", compact ? "max-w-md" : "max-w-xl")}
      role="list"
      aria-label="文档处理进度"
    >
      <ol className={cn("flex items-start", compact ? "gap-1" : "gap-2")}>
        {STEP_ORDER.map((step, index) => {
          const meta = DOCUMENT_PIPELINE_STEPS.find((item) => item.key === step)!;
          const Icon = STEP_ICONS[step];
          const spinning = step === "parsing" || step === "indexing";
          const completed = !failed && currentIndex > index;
          const active = !failed && current === step;
          const upcoming = !failed && currentIndex < index;

          return (
            <li key={step} className="flex min-w-0 flex-1 flex-col items-center" role="listitem">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <span
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      completed ? "bg-success" : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full border-2",
                    compact ? "h-7 w-7" : "h-8 w-8",
                    completed && "border-success bg-success/10 text-success",
                    active && "border-primary bg-primary/10 text-primary",
                    upcoming && "border-border bg-muted/40 text-muted-foreground",
                    failed && index < STEP_ORDER.length - 1 && "opacity-40",
                  )}
                >
                  <Icon
                    className={cn(
                      compact ? "h-3.5 w-3.5" : "h-4 w-4",
                      active && spinning && "animate-spin",
                    )}
                    aria-hidden
                  />
                </span>
                {index < STEP_ORDER.length - 1 ? (
                  <span
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      completed ? "bg-success" : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>
              <p
                className={cn(
                  "mt-1.5 text-center font-medium",
                  compact ? "text-[10px]" : "text-xs",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {meta.label}
              </p>
            </li>
          );
        })}
        {failed ? (
          <li className="flex min-w-0 flex-1 flex-col items-center" role="listitem">
            <div className="flex w-full items-center">
              <span className="h-0.5 flex-1 rounded-full bg-destructive/40" aria-hidden />
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 text-destructive",
                  compact ? "h-7 w-7" : "h-8 w-8",
                )}
              >
                <AlertCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
              </span>
              <span className="flex-1" aria-hidden />
            </div>
            <p
              className={cn(
                "mt-1.5 text-center font-medium text-destructive",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              失败
            </p>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
