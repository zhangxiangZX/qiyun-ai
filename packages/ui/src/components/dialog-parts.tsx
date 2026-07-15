"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import {
  Upload,
  Phone,
  MessageCircle,
  Mail,
  Building2,
  Copy,
} from "lucide-react";

import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  DialogParts – Reusable inner-content components for common modal patterns */
/*  Used inside <Dialog> body to match specific 弹框 designs                  */
/* -------------------------------------------------------------------------- */

// ── Upload Area ─────────────────────────────────────────────────────────────
// Matches designs #11(上传附件), #33(上传Logo)

export interface UploadAreaProps {
  /** Accepted MIME types string for input accept attribute */
  accept?: string;
  /** Max file size hint text (e.g. "最大 10MB") */
  maxSizeHint?: string;
  /** Supported formats hint text */
  formatHint?: string;
  disabled?: boolean;
  className?: string;
  onFileSelect?: (files: FileList | null) => void;
}

export function UploadArea({
  accept,
  maxSizeHint = "最大 10MB",
  formatHint = "支持常见文档格式（PDF、Word、Excel、图片等）",
  disabled = false,
  className,
  onFileSelect,
}: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && onFileSelect) onFileSelect(e.dataTransfer.files);
  }

  function handleClick() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-control border-2 border-dashed p-8 transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted hover:border-primary/50 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <div className="rounded-full bg-primary/10 p-3">
        <Upload className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-medium text-card-foreground">
        点击或拖拽文件到此区域上传
      </p>
      <p className="text-xs text-muted-foreground">
        {formatHint} · {maxSizeHint}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={(e) => onFileSelect?.(e.target.files)}
        disabled={disabled}
        className="hidden"
        aria-label="选择文件"
      />
    </div>
  );
}

// ── Contact Method Grid ──────────────────────────────────────────────────────
// Matches design #12(联系客户)

export interface ContactMethodItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick?: () => void;
}

/** A single contact method button */
export function ContactMethodItem({ icon: Icon, label, value, onClick }: ContactMethodItemProps) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-2 rounded-control border border-border p-4 transition-colors hover:bg-accent hover:border-primary/30"
      onClick={onClick}
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-xs font-medium text-card-foreground">{label}</span>
      {value ? (
        <span className="max-w-[100px] truncate text-[11px] text-muted-foreground">
          {value}
        </span>
      ) : null}
    </button>
  );
}

/** Pre-built contact grid matching design #12 */
export interface ContactMethodGridProps {
  phone?: string;
  wechat?: string;
  email?: string;
  wecom?: string;
  onPhoneClick?: () => void;
  onWechatClick?: () => void;
  onEmailClick?: () => void;
  onWecomClick?: () => void;
  className?: string;
}

export function ContactMethodGrid({
  phone,
  wechat,
  email,
  wecom,
  onPhoneClick,
  onWechatClick,
  onEmailClick,
  onWecomClick,
  className,
}: ContactMethodGridProps) {
  const methods = [
    { icon: Phone, label: "电话联系", value: phone, onClick: onPhoneClick },
    { icon: MessageCircle, label: "微信联系", value: wechat, onClick: onWechatClick },
    { icon: Mail, label: "发送邮件", value: email, onClick: onEmailClick },
    { icon: Building2, label: "企微待办", value: wecom, onClick: onWecomClick },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {methods.map((m) =>
        m.onClick || m.value ? (
          <ContactMethodItem key={m.label} {...m} />
        ) : null,
      )}
    </div>
  );
}

// ── Copy Link Content ───────────────────────────────────────────────────────
// Matches design #20(复制链接), #21(下载二维码_选型页弹窗)

export interface CopyLinkContentProps {
  url: string;
  copyLabel?: string;
  cancelLabel?: string;
  onCopy?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function CopyLinkContent({
  url,
  copyLabel = "复制链接",
  cancelLabel = "关闭",
  onCopy,
  onCancel,
  className,
}: CopyLinkContentProps) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    }).catch(() => {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    });
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* URL display */}
      <div className="rounded-control bg-muted/50 p-3">
        <p className="break-all text-xs leading-relaxed text-card-foreground/80 font-mono">
          {url}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="default"
          className="flex-1"
          onClick={handleCopy}
          leftIcon={<Copy className="h-4 w-4" />}
        >
          {copied ? "已复制！" : copyLabel}
        </Button>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
