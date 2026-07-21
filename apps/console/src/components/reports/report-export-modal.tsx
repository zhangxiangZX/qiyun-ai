"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import { Button, Select } from "@qiyun/ui";

import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createReportExport,
  mapUiTypeToApiType,
  type ReportExportApiType,
  type ReportExportTask,
  type ReportExportUiType,
} from "@/lib/reports/export-api";

const REPORT_TYPE_HINTS: Record<ReportExportUiType, string> = {
  sales: "导出有效询盘、高意向、报价与成交等销售汇总指标（CSV）。",
  inquiry: "导出询盘 ID、客户、来源、意向、状态、负责人与创建时间（CSV）。",
  channel: "导出各渠道的询盘数、报价数、成交数与成交金额（CSV）。",
};

export function ReportExportModal({
  open,
  onClose,
  previewMode = false,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  previewMode?: boolean;
  /** 由页面拉取真实数据并生成 CSV；返回任务用于写入历史 */
  onExport: (type: ReportExportApiType) => Promise<ReportExportTask>;
}) {
  const [reportType, setReportType] = useState<ReportExportUiType>("sales");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || typeof document === "undefined") return null;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const apiType = mapUiTypeToApiType(reportType);
      if (previewMode) {
        await onExport(apiType);
      } else {
        try {
          await createReportExport(apiType);
        } catch {
          // memory / 旧后端可能无法持久化导出任务；仍用前端 CSV 保证有数据可下。
        }
        await onExport(apiType);
      }
      onClose();
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "导出失败，请稍后重试。"));
    } finally {
      setExporting(false);
    }
  };

  return createPortal(
    <div
      data-dialog-overlay=""
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl opacity-100">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">导出报表</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {previewMode ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              当前为演示环境：将按页面已加载的业务数据生成 CSV；若暂无数据会导出含表头的空表。
            </p>
          ) : null}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">选择报表类型</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">报表类型</span>
                <Select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as ReportExportUiType)}
                >
                  <option value="sales">销售业绩报表</option>
                  <option value="inquiry">询盘报表</option>
                  <option value="channel">渠道分析报表</option>
                </Select>
              </label>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {REPORT_TYPE_HINTS[reportType]}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">导出格式</h3>
            <div className="rounded-xl border border-primary bg-primary/5 p-4 text-left ring-1 ring-primary">
              <FileText className="mb-2 h-6 w-6 text-primary" />
              <p className="text-sm font-medium">CSV (.csv)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                当前版本仅支持 CSV 导出，Excel / PDF 格式将在后续版本开放。
              </p>
            </div>
          </section>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={exporting}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleExport()} loading={exporting}>
            开始导出
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
