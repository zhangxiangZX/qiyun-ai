import { forwardRef, useMemo, useState } from "react";

import { LeadAttachmentField, type LeadAttachmentSelection } from "./LeadAttachmentField";
import { uploadLeadAttachment } from "../lib/lead-attachments-api";
import { LEAD_FIELD_LABELS, LEAD_FIELD_PLACEHOLDERS, resolveLeadFields } from "../lib/lead-fields";
import styles from "../styles/widget.module.css";

interface LeadCaptureFormProps {
  fields: string[];
  accent: string;
  submitting: boolean;
  errorMessage?: string;
  privacyPolicyUrl?: string;
  apiBase: string;
  botId: string;
  siteKey: string;
  conversationId?: string;
  onSubmit: (values: Record<string, string>) => void;
  onDismiss?: () => void;
}

export const LeadCaptureForm = forwardRef<HTMLElement, LeadCaptureFormProps>(function LeadCaptureForm(
  {
  fields,
  accent,
  submitting,
  errorMessage,
  privacyPolicyUrl = "/legal/privacy-policy",
  apiBase,
  botId,
  siteKey,
  conversationId,
  onSubmit,
  onDismiss,
  },
  ref,
) {
  const activeFields = useMemo(() => resolveLeadFields(fields), [fields]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [consentError, setConsentError] = useState<string | undefined>();
  const [attachment, setAttachment] = useState<LeadAttachmentSelection | null>(null);
  const [uploadSupported, setUploadSupported] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  async function handleSubmit() {
    if (!acceptedPrivacy) {
      setConsentError("提交前请阅读并同意隐私政策。");
      return;
    }
    setConsentError(undefined);

    const payload = Object.fromEntries(
      activeFields.map((field) => [field, (values[field] ?? "").trim()]),
    );

    if (attachment?.file) {
      if (attachment.status === "error") {
        return;
      }

      if (uploadSupported && conversationId) {
        setLocalSubmitting(true);
        setAttachment((current) =>
          current ? { ...current, status: "uploading", errorMessage: undefined } : current,
        );
        try {
          const uploaded = await uploadLeadAttachment({
            apiBase,
            botId,
            siteKey,
            conversationId,
            file: attachment.file,
          });
          payload.attachmentId = uploaded.id;
          payload.drawingAttachment = uploaded.fileName;
          setAttachment((current) => (current ? { ...current, status: "uploaded" } : current));
        } catch (error) {
          const message = error instanceof Error ? error.message : "附件上传失败，请稍后重试。";
          setAttachment((current) =>
            current ? { ...current, status: "error", errorMessage: message } : current,
          );
          setLocalSubmitting(false);
          return;
        } finally {
          setLocalSubmitting(false);
        }
      } else {
        const note = `已选附件：${attachment.file.name}（当前环境暂不支持上传，请销售联系后补传）`;
        payload.drawingAttachment = payload.drawingAttachment
          ? `${payload.drawingAttachment}\n${note}`
          : note;
      }
    }

    onSubmit(payload);
  }

  const busy = submitting || localSubmitting;

  return (
    <section ref={ref} className={styles.leadPanel} aria-label="留资表单">
      <div className={styles.leadHeader}>
        <strong>留下联系方式</strong>
        <p>我们已识别到报价/图纸/交期等高意向需求，请补充信息以便工程师跟进。</p>
      </div>

      {activeFields.map((field) => {
        const multiline = field === "requirement" || field === "drawingAttachment";
        return (
          <label key={field} className={styles.leadField}>
            <span>{LEAD_FIELD_LABELS[field] ?? field}</span>
            {multiline ? (
              <textarea
                rows={3}
                value={values[field] ?? ""}
                placeholder={LEAD_FIELD_PLACEHOLDERS[field] ?? ""}
                disabled={busy}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field]: event.target.value }))
                }
              />
            ) : (
              <input
                type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                value={values[field] ?? ""}
                placeholder={LEAD_FIELD_PLACEHOLDERS[field] ?? ""}
                disabled={busy}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field]: event.target.value }))
                }
              />
            )}
          </label>
        );
      })}

      <LeadAttachmentField
        apiBase={apiBase}
        disabled={busy}
        selection={attachment}
        onSelectionChange={setAttachment}
        onSupportChange={setUploadSupported}
      />

      {errorMessage ? <p className={styles.leadError}>{errorMessage}</p> : null}

      <label className={styles.leadConsent}>
        <input
          type="checkbox"
          checked={acceptedPrivacy}
          disabled={submitting}
          onChange={(event) => {
            setAcceptedPrivacy(event.target.checked);
            if (event.target.checked) setConsentError(undefined);
          }}
        />
        <span>
          我已阅读并同意
          <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
            《隐私政策》
          </a>
          ，授权企业联系我就本次询盘需求进行跟进。
        </span>
      </label>
      {consentError ? <p className={styles.leadError}>{consentError}</p> : null}

      <div className={styles.leadActions}>
        <button
          type="button"
          className={styles.sendButton}
          style={{ background: accent }}
          disabled={busy}
          onClick={() => void handleSubmit()}
        >
          {busy ? "提交中..." : "提交留资"}
        </button>
        {onDismiss ? (
          <button type="button" className={styles.linkButton} disabled={busy} onClick={onDismiss}>
            稍后再说
          </button>
        ) : null}
      </div>
    </section>
  );
});
