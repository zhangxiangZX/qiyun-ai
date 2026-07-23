"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Globe2, Plus, Wrench } from "lucide-react";

import { Alert, Button, EmptyState, Label, PageHeader, Skeleton } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { DomainWhitelistCard } from "@/components/sites/domain-whitelist-card";
import { EmbedCodeCard } from "@/components/sites/embed-code-card";
import { SiteKeyCard } from "@/components/sites/site-key-card";
import { SiteKeyRevealPanel } from "@/components/sites/site-key-reveal-panel";
import { TestMessageCard } from "@/components/sites/test-message-card";
import {
  getSitesCapabilities,
  listSites,
  rotateKey,
  saveDomains,
  testMessage,
  type SitesCapabilities,
} from "@/lib/sites/data";
import type { SiteConfig, SiteKeyRotationResult } from "@/lib/sites/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

type LoadState = "loading" | "ready" | "error";

export function SitesWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [capabilities, setCapabilities] = useState<SitesCapabilities | null>(null);
  const [draftDomains, setDraftDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rotateMessage, setRotateMessage] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [revealedRotation, setRevealedRotation] = useState<SiteKeyRotationResult | null>(null);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [sites, selectedSiteId],
  );

  const previewMode = capabilities?.dataMode === "preview";

  const dirty = useMemo(() => {
    if (!selectedSite) return false;
    if (draftDomains.length !== selectedSite.allowedDomains.length) return true;
    return draftDomains.some((domain, index) => domain !== selectedSite.allowedDomains[index]);
  }, [draftDomains, selectedSite]);

  const loadSites = useCallback(async () => {
    setLoadState("loading");
    setSaveError(null);
    setRotateError(null);
    try {
      const [data, caps] = await Promise.all([listSites(), getSitesCapabilities()]);
      setSites(data);
      setCapabilities(caps);
      setSelectedSiteId((current) => current || data[0]?.id || "");
      setLoadState("ready");
    } catch {
      setLoadState("error");
      setSites([]);
    }
  }, []);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (!selectedSite) {
      setDraftDomains([]);
      return;
    }
    setDraftDomains(selectedSite.allowedDomains);
    setSaveMessage(null);
    setRotateMessage(null);
    setSaveError(null);
    setRotateError(null);
  }, [selectedSite]);

  async function handleSaveDomains() {
    if (!selectedSite) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const updated = await saveDomains(selectedSite.id, draftDomains);
      if (updated) {
        setSites((current) => current.map((site) => (site.id === updated.id ? updated : site)));
        setSaveMessage(t(defaultLocale, "sites.domains.saved"));
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存域名白名单失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleRotateKey() {
    if (!selectedSite) return;
    setRotating(true);
    setRotateMessage(null);
    setRotateError(null);
    try {
      const result = await rotateKey(selectedSite.id);
      if (result) {
        setSites((current) =>
          current.map((site) => (site.id === result.site.id ? result.site : site)),
        );
        setRevealedRotation(result);
        setRotateMessage(t(defaultLocale, "sites.key.rotated"));
      }
    } catch (error) {
      setRotateError(error instanceof Error ? error.message : "轮换站点密钥失败，请稍后重试。");
    } finally {
      setRotating(false);
    }
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/sites/appearance">
          <Wrench className="mr-1.5 h-4 w-4" />
          外观与行为
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/sites/install">
          <BookOpen className="mr-1.5 h-4 w-4" />
          安装说明
        </Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/dashboard/sites/new">
          <Plus className="mr-1.5 h-4 w-4" />
          添加站点
        </Link>
      </Button>
    </div>
  );

  if (loadState === "loading") {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleModeBadge />
          <ConsoleDataModeBanner feature="官网 Widget" />
        </ConsolePageAlerts>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "sites.title")}
          description={t(defaultLocale, "sites.description")}
          actions={headerActions}
        />
        <div className="space-y-4 pb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      </ConsolePage>
    );
  }

  if (loadState === "error") {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleModeBadge />
          <ConsoleDataModeBanner feature="官网 Widget" />
        </ConsolePageAlerts>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "sites.title")}
          description={t(defaultLocale, "sites.description")}
          actions={headerActions}
        />
        <div className="space-y-4 pb-6">
          <ConsoleRequestError
            message={t(defaultLocale, "sites.error.load")}
            onRetry={() => void loadSites()}
          />
        </div>
      </ConsolePage>
    );
  }

  if (!sites.length) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleModeBadge />
          <ConsoleDataModeBanner feature="官网 Widget" />
        </ConsolePageAlerts>
        <PageHeader
          variant="compact"
          title="站点安全设置"
          description="管理域名白名单、站点密钥与嵌入代码。请先接入至少一个官网站点后再配置安全项。"
          actions={headerActions}
        />
        <div className="pb-6" data-testid="sites-settings-empty">
          <EmptyState
            icon={<Globe2 className="h-8 w-8" aria-hidden />}
            title="暂无站点，无法配置域名白名单与站点密钥"
            description="接入站点后可在此管理域名白名单、轮换站点密钥，并复制 Widget 嵌入代码。也可从站点列表先「添加第一个站点」。"
            action={
              <Button asChild>
                <Link href="/dashboard/sites/new">添加第一个站点</Link>
              </Button>
            }
          />
        </div>
      </ConsolePage>
    );
  }

  if (!selectedSite) {
    return (
      <ConsolePage>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "sites.title")}
          description={t(defaultLocale, "sites.description")}
          actions={headerActions}
        />
        <Skeleton className="h-72 rounded-card" />
      </ConsolePage>
    );
  }

  const domainsReadOnly = !capabilities?.canSaveDomains;
  const embedSnippet =
    revealedRotation?.site.id === selectedSite.id
      ? revealedRotation.site.embedSnippet
      : selectedSite.embedSnippet;

  return (
    <ConsolePage>
      <div data-testid="sites-settings-ready" hidden>
        站点安全设置已就绪：域名白名单、站点密钥、嵌入代码
      </div>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="官网 Widget" />
        {capabilities ? (
          <p className="text-xs text-muted-foreground">{capabilities.syncStatusLabel}</p>
        ) : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        title="站点安全设置"
        description="管理官网站点的域名白名单、站点密钥与 Widget 嵌入代码，将 AI 助手安全接入企业官网。"
        actions={headerActions}
      />

      <div className="space-y-4 pb-6">
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md flex-1 space-y-2">
            <Label htmlFor="site-select">当前站点</Label>
            <select
              id="site-select"
              className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
              value={selectedSiteId}
              onChange={(event) => setSelectedSiteId(event.target.value)}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.botName} · {site.allowedDomains[0] ?? site.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/sites/install">
                <BookOpen className="mr-1.5 h-4 w-4" />
                查看安装步骤
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/sites/appearance">
                <Wrench className="mr-1.5 h-4 w-4" />
                外观与行为设置
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/bots/config">配置绑定助手</Link>
            </Button>
          </div>
        </div>

        {saveMessage ? <Alert variant="success" title={saveMessage} /> : null}
        {saveError ? <Alert variant="error" title={saveError} /> : null}
        {rotateMessage ? <Alert variant="success" title={rotateMessage} /> : null}
        {rotateError ? <Alert variant="error" title={rotateError} /> : null}

        {revealedRotation && revealedRotation.site.id === selectedSite.id ? (
          <SiteKeyRevealPanel
            siteKey={revealedRotation.revealedSiteKey}
            embedSnippet={revealedRotation.site.embedSnippet ?? ""}
            previewMode={previewMode}
            onDismiss={() => setRevealedRotation(null)}
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <DomainWhitelistCard
            domains={draftDomains}
            saving={saving}
            dirty={dirty}
            readOnly={domainsReadOnly}
            readOnlyReason={capabilities?.domainsReadOnlyReason}
            onChange={setDraftDomains}
            onSave={() => void handleSaveDomains()}
          />
          <div className="space-y-4">
            <EmbedCodeCard embedSnippet={embedSnippet} />
            <SiteKeyCard
              siteKeyPrefix={selectedSite.siteKeyPrefix}
              rotating={rotating}
              previewMode={previewMode}
              onRotate={() => void handleRotateKey()}
            />
          </div>
        </div>

        <TestMessageCard
          allowedDomains={draftDomains.length ? draftDomains : selectedSite.allowedDomains}
          savedDomains={selectedSite.allowedDomains}
          dirty={dirty}
          simulationHint={capabilities?.testMessageHint}
          onTest={(origin, message) => testMessage(selectedSite, { origin, message })}
        />
      </div>
    </ConsolePage>
  );
}
