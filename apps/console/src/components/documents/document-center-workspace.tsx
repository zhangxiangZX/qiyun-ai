"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Files,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { Button, Skeleton } from "@qiyun/ui";

import { ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getDocumentCapabilities } from "@/lib/documents/capabilities";
import type { DocumentCapabilities } from "@/lib/documents/capabilities";
import {
  deleteDocument,
  downloadDocumentBlob,
  downloadWatermarkedBlob,
  listDocuments,
  uploadDocument,
} from "@/lib/documents/data";
import { watermarkImageBlob } from "@/lib/documents/watermark-client";
import type {
  DocumentCategory,
  DocumentItem,
} from "@/lib/documents/types";
import { DocumentList } from "@/components/documents/document-list";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import styles from "@/styles/documents.module.css";

type LoadState = "loading" | "ready" | "error";
type NoticeKind = "info" | "error" | "success";

interface Notice {
  kind: NoticeKind;
  message: string;
}

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

export function DocumentCenterWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [capabilities, setCapabilities] = useState<DocumentCapabilities | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [watermarkingId, setWatermarkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setListError(null);
    try {
      const [caps, data] = await Promise.all([
        getDocumentCapabilities(),
        listDocuments(),
      ]);
      setCapabilities(caps);
      setDocuments(data);
      setLoadState("ready");
    } catch (error) {
      setListError(getApiErrorMessage(error, t(defaultLocale, "documents.error.load")));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  const kpis = useMemo(() => {
    let images = 0;
    let watermarkable = 0;
    let watermarked = 0;
    for (const doc of documents) {
      if (doc.kind === "image") images += 1;
      if (doc.watermarkable) watermarkable += 1;
      if (doc.watermarked) watermarked += 1;
    }
    return { total: documents.length, images, watermarkable, watermarked };
  }, [documents]);

  async function handleUpload(file: File, category: DocumentCategory) {
    setUploadLoading(true);
    setUploadError(null);
    try {
      await uploadDocument({ file, category, uploadedBy: "演示用户" });
      setUploadOpen(false);
      setUploadLoading(false);
      await load();
      setNotice({ kind: "success", message: t(defaultLocale, "documents.notice.uploaded") });
    } catch (error) {
      setUploadLoading(false);
      setUploadError(getApiErrorMessage(error, t(defaultLocale, "documents.error.upload")));
    }
  }

  async function handleDownload(doc: DocumentItem) {
    setDownloadingId(doc.id);
    try {
      const blob = await downloadDocumentBlob(doc.id);
      triggerDownload(blob, doc.name);
    } catch (error) {
      setNotice({ kind: "error", message: getApiErrorMessage(error, t(defaultLocale, "documents.error.download")) });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleWatermark(doc: DocumentItem) {
    if (!doc.watermarkable) {
      setNotice({ kind: "info", message: t(defaultLocale, "documents.notice.wmUnsupported") });
      return;
    }
    setWatermarkingId(doc.id);
    try {
      if (doc.kind === "image") {
        const blob = await downloadWatermarkedBlob(doc.id);
        const watermarked = await watermarkImageBlob(blob, {
          text: "AI云 · 机密",
          owner: `领取人：${doc.uploadedBy}`,
        });
        const name = doc.name.replace(/\.[^.]+$/, "");
        triggerDownload(watermarked, `${name}_水印.png`);
        setDocuments((prev) =>
          prev.map((item) => (item.id === doc.id ? { ...item, watermarked: true } : item)),
        );
        setNotice({ kind: "success", message: t(defaultLocale, "documents.notice.wmImage") });
      } else if (capabilities?.dataMode === "preview") {
        const blob = await downloadDocumentBlob(doc.id);
        triggerDownload(blob, doc.name);
        setNotice({ kind: "info", message: t(defaultLocale, "documents.notice.wmPreviewPdf") });
      } else {
        const blob = await downloadWatermarkedBlob(doc.id);
        triggerDownload(blob, doc.name);
        setNotice({ kind: "success", message: t(defaultLocale, "documents.notice.wmPdf") });
      }
    } catch (error) {
      setNotice({ kind: "error", message: getApiErrorMessage(error, t(defaultLocale, "documents.error.watermark")) });
    } finally {
      setWatermarkingId(null);
    }
  }

  async function handleDelete(doc: DocumentItem) {
    try {
      await deleteDocument(doc.id);
      await load();
      setNotice({ kind: "success", message: t(defaultLocale, "documents.notice.deleted") });
    } catch (error) {
      setNotice({ kind: "error", message: getApiErrorMessage(error, t(defaultLocale, "documents.error.delete")) });
    }
  }

  if (loadState === "loading") {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>{t(defaultLocale, "documents.loading")}</p>
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1>{t(defaultLocale, "documents.title")}</h1>
          <p>{t(defaultLocale, "documents.description")}</p>
        </header>
        <ConsoleRequestError
          message={listError ?? t(defaultLocale, "documents.error.load")}
          onRetry={() => void load()}
          retryLabel={t(defaultLocale, "dashboard.error.retry")}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <div>
            <h1>{t(defaultLocale, "documents.title")}</h1>
            <p>{t(defaultLocale, "documents.description")}</p>
          </div>
          <span className={styles.previewBadge}>
            <Sparkles size={12} aria-hidden /> {t(defaultLocale, "documents.previewBadge")}
          </span>
        </div>
      </header>

      <div className={`${styles.kpiGrid} ui-stagger-fade-in ui-hover-lift-children`}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "documents.kpi.total")}</div>
              <div className={styles.kpiValue}>{kpis.total}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#3b5eff] text-white`}>
              <Files size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "documents.kpi.images")}</div>
              <div className={styles.kpiValue}>{kpis.images}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#0ea5e9] text-white`}>
              <ImageIcon size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "documents.kpi.watermarkable")}</div>
              <div className={styles.kpiValue}>{kpis.watermarkable}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#f97316] text-white`}>
              <ShieldCheck size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "documents.kpi.watermarked")}</div>
              <div className={styles.kpiValue}>{kpis.watermarked}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#22c55e] text-white`}>
              <BadgeCheck size={20} aria-hidden />
            </div>
          </div>
        </article>
      </div>

      <div className={styles.topActions}>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload size={16} aria-hidden />
          {t(defaultLocale, "documents.uploadButton")}
        </Button>
        <ConsoleModeBadge />
      </div>

      {notice ? (
        <p
          className={`${styles.notice} ${
            notice.kind === "error"
              ? styles.noticeError
              : notice.kind === "success"
                ? styles.noticeSuccess
                : styles.noticeInfo
          }`}
        >
          {notice.message}
        </p>
      ) : null}

      {capabilities?.dataMode === "upstream" && capabilities.watermarkNote ? (
        <p className={styles.upstreamNote}>{capabilities.watermarkNote}</p>
      ) : capabilities?.uploadNote ? (
        <p className={styles.upstreamNote}>{capabilities.uploadNote}</p>
      ) : null}

      <article className={`${styles.card} ui-stagger-fade-in ui-hover-lift-children`}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>{t(defaultLocale, "documents.listTitle")}</h2>
        </div>
        <DocumentList
          documents={documents}
          downloadingId={downloadingId}
          watermarkingId={watermarkingId}
          onDownload={handleDownload}
          onWatermark={handleWatermark}
          onDelete={handleDelete}
        />
      </article>

      <UploadDocumentDialog
        open={uploadOpen}
        loading={uploadLoading}
        error={uploadError}
        onClose={() => {
          setUploadOpen(false);
          setUploadError(null);
        }}
        onUpload={handleUpload}
      />
    </div>
  );
}
