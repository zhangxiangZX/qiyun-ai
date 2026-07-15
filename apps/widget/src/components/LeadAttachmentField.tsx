import { useEffect, useId, useState } from "react";

import {
  ACCEPTED_LEAD_ATTACHMENT_TYPES,
  formatAttachmentSize,
  probeLeadAttachmentUpload,
  validateLeadAttachmentFile,
} from "../lib/lead-attachments-api";
import styles from "../styles/widget.module.css";

export type LeadAttachmentFieldStatus =
  | "checking"
  | "unsupported"
  | "idle"
  | "selected"
  | "uploading"
  | "uploaded"
  | "error";

export interface LeadAttachmentSelection {
  file: File;
  status: LeadAttachmentFieldStatus;
  errorMessage?: string;
}

interface LeadAttachmentFieldProps {
  apiBase: string;
  disabled?: boolean;
  selection: LeadAttachmentSelection | null;
  onSelectionChange: (next: LeadAttachmentSelection | null) => void;
  onSupportChange?: (supported: boolean) => void;
}

export function LeadAttachmentField({
  apiBase,
  disabled = false,
  selection,
  onSelectionChange,
  onSupportChange,
}: LeadAttachmentFieldProps) {
  const inputId = useId();
  const [supportState, setSupportState] = useState<"checking" | "supported" | "unsupported">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;

    async function checkSupport() {
      setSupportState("checking");
      const supported = await probeLeadAttachmentUpload(apiBase);
      if (cancelled) return;
      setSupportState(supported ? "supported" : "unsupported");
      onSupportChange?.(supported);
    }

    void checkSupport();

    return () => {
      cancelled = true;
    };
  }, [apiBase, onSupportChange]);

  function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      onSelectionChange(null);
      return;
    }

    const validationError = validateLeadAttachmentFile(file);
    if (validationError) {
      onSelectionChange({
        file,
        status: "error",
        errorMessage: validationError,
      });
      return;
    }

    onSelectionChange({
      file,
      status: supportState === "supported" ? "selected" : "selected",
    });
  }

  const fieldDisabled =
    disabled || supportState === "checking" || selection?.status === "uploading";

  return (
    <div className={styles.leadAttachmentBlock}>
      <div className={styles.leadAttachmentHeader}>
        <label htmlFor={inputId}>图纸 / 附件（可选）</label>
        {supportState === "checking" ? (
          <span className={styles.leadAttachmentHint}>检测上传能力…</span>
        ) : null}
      </div>

      {supportState === "unsupported" ? (
        <p className={styles.leadAttachmentNotice} role="status">
          当前环境暂不支持附件上传。您可先提交留资，并在「图纸附件说明」中描述文件信息，销售会主动联系索取。
        </p>
      ) : null}

      <div className={styles.leadAttachmentRow}>
        <input
          id={inputId}
          type="file"
          className={styles.leadAttachmentInput}
          accept={ACCEPTED_LEAD_ATTACHMENT_TYPES}
          disabled={fieldDisabled}
          onChange={(event) => handleFileChange(event.target.files)}
        />
        <label htmlFor={inputId} className={styles.leadAttachmentButton}>
          {selection?.status === "uploading" ? "上传中…" : "选择文件"}
        </label>
        {selection ? (
          <button
            type="button"
            className={styles.linkButton}
            disabled={fieldDisabled}
            onClick={() => onSelectionChange(null)}
          >
            移除
          </button>
        ) : null}
      </div>

      {selection ? (
        <div className={styles.leadAttachmentMeta} role="status">
          <span className={styles.leadAttachmentName}>{selection.file.name}</span>
          <span>{formatAttachmentSize(selection.file.size)}</span>
          {selection.status === "uploading" ? <span>上传中…</span> : null}
          {selection.status === "uploaded" ? <span className={styles.leadAttachmentOk}>已上传</span> : null}
          {selection.status === "error" && selection.errorMessage ? (
            <span className={styles.leadError}>{selection.errorMessage}</span>
          ) : null}
          {selection.status === "selected" && supportState === "unsupported" ? (
            <span className={styles.leadAttachmentHint}>将随留资一并记录文件名</span>
          ) : null}
        </div>
      ) : (
        <p className={styles.leadAttachmentHint}>支持 PDF、图片、ZIP、CAD 等，单文件不超过 10MB。</p>
      )}
    </div>
  );
}
