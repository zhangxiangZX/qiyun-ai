import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

import {
  DATA_MODE_SHORT,
  DATA_MODE_TITLES,
  getFeatureDataModeHint,
  type ConsoleDataMode,
} from "./data-mode-hints";

export type SaveFeedbackScope =
  | "generic"
  | "create"
  | "lead"
  | "domain"
  | "keyRotate"
  | "bot"
  | "conversationStatus"
  | "conversationTags";

const PREVIEW_FEEDBACK_KEYS: Record<SaveFeedbackScope, keyof typeof zhCNModeFeedback> = {
  generic: "previewSaved",
  create: "previewCreated",
  lead: "leadPreviewSaved",
  domain: "domainPreviewSaved",
  keyRotate: "keyPreviewRotated",
  bot: "botPreviewSaved",
  conversationStatus: "conversationStatusPreview",
  conversationTags: "conversationTagsPreview",
};

const UPSTREAM_FEEDBACK_KEYS: Record<SaveFeedbackScope, keyof typeof zhCNModeFeedback> = {
  generic: "upstreamSaved",
  create: "upstreamCreated",
  lead: "leadUpstreamSaved",
  domain: "domainUpstreamSaved",
  keyRotate: "keyUpstreamRotated",
  bot: "botUpstreamSaved",
  conversationStatus: "conversationStatusUpstream",
  conversationTags: "conversationTagsUpstream",
};

const zhCNModeFeedback = {
  previewSaved: "mode.feedback.previewSaved",
  upstreamSaved: "mode.feedback.upstreamSaved",
  previewCreated: "mode.feedback.previewCreated",
  upstreamCreated: "mode.feedback.upstreamCreated",
  leadPreviewSaved: "mode.feedback.leadPreviewSaved",
  leadUpstreamSaved: "mode.feedback.leadUpstreamSaved",
  domainPreviewSaved: "mode.feedback.domainPreviewSaved",
  domainUpstreamSaved: "mode.feedback.domainUpstreamSaved",
  keyPreviewRotated: "mode.feedback.keyPreviewRotated",
  keyUpstreamRotated: "mode.feedback.keyUpstreamRotated",
  botPreviewSaved: "mode.feedback.botPreviewSaved",
  botUpstreamSaved: "mode.feedback.botUpstreamSaved",
  conversationStatusPreview: "mode.feedback.conversationStatusPreview",
  conversationStatusUpstream: "mode.feedback.conversationStatusUpstream",
  conversationTagsPreview: "mode.feedback.conversationTagsPreview",
  conversationTagsUpstream: "mode.feedback.conversationTagsUpstream",
} as const;

export function getModeBadgeLabel(mode: ConsoleDataMode): string {
  return mode === "preview"
    ? t(defaultLocale, "mode.badge.preview")
    : t(defaultLocale, "mode.badge.upstream");
}

export function getPreviewNoticeTitle(mode: ConsoleDataMode): string {
  return mode === "preview"
    ? t(defaultLocale, "mode.notice.previewTitle")
    : t(defaultLocale, "mode.notice.upstreamTitle");
}

export function getDataModeBannerPresentation(
  mode: ConsoleDataMode,
  feature?: string,
  upstreamFallbackMessage?: string,
): { variant: "success" | "warning"; title: string; body: string } {
  const featureHint = getFeatureDataModeHint(feature, mode);
  const prefix = feature ? `${feature}：` : "";

  if (mode === "upstream") {
    return {
      variant: "success",
      title: DATA_MODE_TITLES.upstream,
      body: `${prefix}${featureHint || upstreamFallbackMessage || DATA_MODE_SHORT.upstream}`,
    };
  }

  const previewBody = t(defaultLocale, "mode.banner.previewBody");
  const suffix = featureHint || DATA_MODE_SHORT.preview;

  return {
    variant: "warning",
    title: DATA_MODE_TITLES.preview,
    body: `${prefix}${previewBody} ${suffix}`,
  };
}

export function getSaveSuccessMessage(
  mode: ConsoleDataMode,
  scope: SaveFeedbackScope,
): string {
  const keys = mode === "preview" ? PREVIEW_FEEDBACK_KEYS : UPSTREAM_FEEDBACK_KEYS;
  return t(defaultLocale, zhCNModeFeedback[keys[scope]]);
}

export function getAnalyticsFootnote(
  feature: "dashboard" | "reports",
  mode: ConsoleDataMode,
): { variant: "info" | "success"; title: string; body: string } {
  if (mode === "preview") {
    return {
      variant: "info",
      title: t(defaultLocale, "mode.analytics.previewTitle"),
      body: t(
        defaultLocale,
        feature === "dashboard"
          ? "mode.analytics.dashboardPreview"
          : "mode.analytics.reportsPreview",
      ),
    };
  }

  return {
    variant: "success",
    title: t(defaultLocale, "mode.analytics.upstreamTitle"),
    body: t(
      defaultLocale,
      feature === "dashboard"
        ? "mode.analytics.dashboardUpstream"
        : "mode.analytics.reportsUpstream",
    ),
  };
}

export function getBotsReadOnlyNotice(scope: "list" | "edit"): string {
  return t(
    defaultLocale,
    scope === "list" ? "bots.mode.previewListReadOnly" : "bots.mode.previewEditReadOnly",
  );
}

export function getSiteTestSuccessMessage(mode: ConsoleDataMode): string {
  return t(
    defaultLocale,
    mode === "preview" ? "sites.mode.testSuccessPreview" : "sites.mode.testSuccessUpstream",
  );
}

export function getNotificationEmptyHint(mode: ConsoleDataMode): string {
  return mode === "preview"
    ? t(defaultLocale, "mode.notifications.emptyPreview")
    : t(defaultLocale, "mode.notifications.emptyUpstream");
}
