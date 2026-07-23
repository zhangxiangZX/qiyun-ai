"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Maximize2,
  Printer,
  Star,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge, Button } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { previewQuoteTemplate, setDefaultQuoteTemplate } from "@/lib/quotes/api";
import { mockQuoteTemplates } from "@/lib/quotes/template-mock-data";
import type { QuotePreviewSample, QuoteTemplate } from "@/lib/quotes/template-types";
import { QuoteHtmlPreview } from "./quote-html-preview";

export function TemplatePreviewWorkspace({ templateId }: { templateId: string }) {
  const [tpl, setTpl] = useState<QuoteTemplate | null>(null);
  const [sample, setSample] = useState<QuotePreviewSample | undefined>(undefined);
  const [zoom, setZoom] = useState(100);
  const [usingMock, setUsingMock] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoadError(null);
        const mode = await fetchConsoleMode();
        if (mode && isPreviewMode(mode)) {
          setTpl(mockQuoteTemplates.find((t) => t.id === templateId) ?? mockQuoteTemplates[0]!);
          setUsingMock(true);
          return;
        }
        const preview = await previewQuoteTemplate(templateId);
        setTpl(preview.template);
        setSample(preview.sample);
        setUsingMock(false);
      } catch (reason) {
        setTpl(null);
        setUsingMock(false);
        setLoadError(reason instanceof Error ? reason.message : "模板预览加载失败。");
      }
    })();
  }, [templateId]);

  if (!tpl) {
    return <p className="p-6 text-sm text-muted-foreground">{loadError ?? "加载预览中…"}</p>;
  }

  const handleSetDefault = async () => {
    if (usingMock) return;
    const updated = await setDefaultQuoteTemplate(templateId);
    setTpl(updated);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/quotes/templates/${templateId}`}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> 返回编辑
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{tpl.templateName}</h1>
          {tpl.isDefault ? <Badge variant="default" className="gap-1 bg-amber-100 text-amber-700"><Star size={11} /> 默认</Badge> : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-blue-600 sm:block" />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-2 text-sm text-slate-600">
        <span className="rounded border border-slate-200 px-2 py-1 font-medium">{zoom}%</span>
        <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="rounded p-1.5 hover:bg-slate-100" aria-label="缩小">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="rounded p-1.5 hover:bg-slate-100" aria-label="放大">
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="mx-2 text-slate-400">|</span>
        <span>第 1 / 1 页</span>
        <span className="mx-2 text-slate-400">|</span>
        <button className="rounded p-1.5 hover:bg-slate-100" title="全屏" aria-label="全屏">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button className="rounded p-1.5 hover:bg-slate-100" title="打印 / 导出 PDF" aria-label="打印" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
        </button>
      </div>

      <ConsoleDataModeBanner feature={usingMock ? "模板预览（演示数据）" : "模板预览"} />

      <div className="flex flex-1 justify-center overflow-auto p-6">
        <div
          className="origin-top"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        >
          <QuoteHtmlPreview ref={sheetRef} config={tpl} sample={sample} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-slate-200 bg-white py-3">
        <Link href={`/dashboard/quotes/templates/${templateId}`}>
          <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
            返回编辑
          </Button>
        </Link>
        <Button variant="outline" leftIcon={<Star size={16} />} onClick={() => void handleSetDefault()} disabled={tpl.isDefault}>
          设为默认模板
        </Button>
        <Button leftIcon={<Download size={16} />} onClick={() => window.print()}>
          下载 PDF
        </Button>
      </div>
    </div>
  );
}
