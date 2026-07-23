"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Maximize2,
  Printer,
  Send,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Alert, Button, Skeleton } from "@qiyun/ui";

import { QuoteHtmlPreview } from "@/components/quotes/quote-html-preview";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getQuoteDocument, type QuoteDocumentPayload } from "@/lib/quotes/api";
import {
  downloadCurrentQuotePdf,
  getQuoteOpportunity,
  sendQuote,
} from "@/lib/sales/api";
import { createQuotePublicLink } from "@/lib/quotes/api";
import type { QuoteDetail } from "@/lib/sales/types";
import { QUOTE_STAGE_LABELS } from "@/lib/sales/types";

export function QuotationPreviewWorkspace({ quoteId: quoteIdProp }: { quoteId?: string } = {}) {
  const params = useParams<{ id: string }>();
  const quoteId = quoteIdProp ?? params.id;

  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<QuoteDocumentPayload | null>(null);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendChannel, setSendChannel] = useState<"email" | "link">("email");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [isPreviewModeFlag, setIsPreviewModeFlag] = useState(false);

  const load = useCallback(async () => {
    if (!quoteId) return;
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : false;
      setIsPreviewModeFlag(preview);

      const [doc, detail] = await Promise.all([
        getQuoteDocument(quoteId),
        getQuoteOpportunity(quoteId),
      ]);
      setDocument(doc);
      setQuote(detail);
      setSendRecipient("");
    } catch (loadError) {
      setDocument(null);
      setQuote(null);
      setError(getApiErrorMessage(loadError, "报价预览加载失败。"));
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownloadPdf = async () => {
    if (!quoteId) return;
    setDownloading(true);
    setNotice(null);
    try {
      await downloadCurrentQuotePdf(quoteId, `quote-${quoteId}.pdf`);
      setNotice("PDF 已开始下载。");
    } catch (downloadError) {
      setNotice(getApiErrorMessage(downloadError, "PDF 下载失败。"));
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!quoteId) return;
    if (isPreviewModeFlag) {
      setNotice("当前为演示模式，无法真实发送邮件或客户链接。");
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      if (sendChannel === "link") {
        const link = await createQuotePublicLink(quoteId);
        setPublicLink(link.url);
        await sendQuote(quoteId, {
          recipient: sendRecipient.trim() || undefined,
          channel: "link",
        });
        setNotice(`客户链接已生成：${link.url}`);
      } else {
        if (!sendRecipient.trim()) {
          setNotice("请填写接收邮箱后再发送。");
          setSending(false);
          return;
        }
        await sendQuote(quoteId, {
          recipient: sendRecipient.trim(),
          channel: "email",
          subject: sendSubject.trim() || undefined,
          body: sendBody.trim() || undefined,
        });
        setNotice("报价已提交发送，请到详情页「发送记录」查看送达状态。");
      }
      const refreshed = await getQuoteOpportunity(quoteId);
      setQuote(refreshed);
    } catch (sendError) {
      setNotice(getApiErrorMessage(sendError, "发送失败，请稍后重试。"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-slate-100 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (error || !document || !quote) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-slate-100 p-6">
        <Alert variant="error" title="无法加载报价预览">
          {error ?? "报价不存在或文档接口不可用。"}
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            重试
          </Button>
          <Button variant="outline" asChild>
            <Link href={quoteId ? `/dashboard/quotes/${quoteId}` : "/dashboard/quotes"}>
              返回报价详情
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const stageLabel = quote.stageLabel || QUOTE_STAGE_LABELS[quote.stage] || quote.stage;
  const emailConnected = !isPreviewModeFlag;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Link
            href={`/dashboard/quotes/${quoteId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回报价详情
          </Link>
          <p className="mt-1 text-sm font-medium text-foreground">
            报价 PDF / HTML 预览 · {stageLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            loading={downloading}
            onClick={() => void handleDownloadPdf()}
          >
            下载 PDF
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quotes/${quoteId}/edit`}>
              <Eye className="mr-1.5 h-4 w-4" />
              编辑报价
            </Link>
          </Button>
        </div>
      </header>

      {notice ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:px-6">
          {notice}
        </div>
      ) : null}

      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 sm:px-6">
        <span className="rounded border border-slate-200 px-2 py-1 font-medium">{zoom}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="rounded p-1.5 hover:bg-slate-100"
          aria-label="缩小"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="rounded p-1.5 hover:bg-slate-100"
          aria-label="放大"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 hover:bg-slate-100"
          title="全屏请使用浏览器全屏"
          aria-label="全屏提示"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 hover:bg-slate-100"
          onClick={() => window.print()}
          aria-label="打印"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-4 lg:flex-row lg:p-6">
        <div className="flex flex-1 justify-center overflow-auto rounded-card bg-slate-200/40 p-3 sm:p-6">
          <div
            className="origin-top w-full max-w-[794px]"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <QuoteHtmlPreview config={document.template} sample={document.sample} />
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-[320px]">
          <section className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">发送给客户</h2>
            {!emailConnected ? (
              <Alert variant="warning" title="邮件发送未接通">
                演示模式下不会真实发信。配置上游 API 后可在此发送。
              </Alert>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">
                可自定义邮件主题与正文；未填写时使用系统默认文案。多附件上传仍待开放。
              </p>
            )}
            <label className="mt-3 block text-xs text-muted-foreground">
              接收邮箱
              <input
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={sendRecipient}
                onChange={(event) => setSendRecipient(event.target.value)}
                placeholder="client@example.com"
                disabled={!emailConnected || sendChannel === "link"}
              />
            </label>
            <label className="mt-3 block text-xs text-muted-foreground">
              发送渠道
              <select
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={sendChannel}
                onChange={(event) => setSendChannel(event.target.value as "email" | "link")}
                disabled={!emailConnected}
              >
                <option value="email">邮件</option>
                <option value="link">客户链接</option>
              </select>
            </label>
            {sendChannel === "email" ? (
              <>
                <label className="mt-3 block text-xs text-muted-foreground">
                  邮件主题（可选）
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={sendSubject}
                    onChange={(event) => setSendSubject(event.target.value)}
                    placeholder="例如：户外机柜报价方案"
                    disabled={!emailConnected}
                  />
                </label>
                <label className="mt-3 block text-xs text-muted-foreground">
                  邮件正文（可选）
                  <textarea
                    className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sendBody}
                    onChange={(event) => setSendBody(event.target.value)}
                    placeholder="您好，附件为本次报价，请查收。"
                    disabled={!emailConnected}
                  />
                </label>
              </>
            ) : null}
            {publicLink ? (
              <p className="mt-2 break-all text-xs text-primary">{publicLink}</p>
            ) : null}
            <Button
              className="mt-4 w-full"
              leftIcon={<Send className="h-4 w-4" />}
              disabled={!emailConnected || sending}
              title={!emailConnected ? "邮件发送未接通" : undefined}
              loading={sending}
              onClick={() => void handleSend()}
            >
              {sending ? "发送中…" : "确认发送"}
            </Button>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">相关附件</h2>
            <Alert variant="info" title="附件能力未接通">
              报价附件上传/下载接口尚未提供，此处不会展示可下载的假文件。
            </Alert>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" />
              可先使用「下载 PDF」获取当前报价文档。
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
