"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2 } from "lucide-react";

import { Alert, Button, EmptyState, Label, PageHeader, Skeleton } from "@qiyun/ui";

import { DomainWhitelistCard } from "@/components/sites/domain-whitelist-card";
import { EmbedCodeCard } from "@/components/sites/embed-code-card";
import { SiteKeyCard } from "@/components/sites/site-key-card";
import { TestMessageCard } from "@/components/sites/test-message-card";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import {
  listSites,
  rotateKey,
  saveDomains,
  SITES_API_AVAILABLE,
  testMessage,
} from "@/lib/sites/data";
import type { SiteConfig } from "@/lib/sites/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

type LoadState = "loading" | "ready" | "error";

export function SitesWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [draftDomains, setDraftDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [rotateMessage, setRotateMessage] = useState<string | null>(null);

  const selectedSite = useMemo(
    () => sites.find((site) => site.botId === selectedBotId) ?? null,
    [sites, selectedBotId],
  );

  const dirty = useMemo(() => {
    if (!selectedSite) return false;
    if (draftDomains.length !== selectedSite.allowedDomains.length) return true;
    return draftDomains.some((domain, index) => domain !== selectedSite.allowedDomains[index]);
  }, [draftDomains, selectedSite]);

  const loadSites = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = await listSites();
      setSites(data);
      setSelectedBotId((current) => current || data[0]?.botId || "");
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
  }, [selectedSite]);

  async function handleSaveDomains() {
    if (!selectedSite) return;
    setSaving(true);
    setSaveMessage(null);
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    const updated = await saveDomains(selectedSite.id, draftDomains);
    if (updated) {
      setSites((current) => current.map((site) => (site.id === updated.id ? updated : site)));
      setSaveMessage(t(defaultLocale, "sites.domains.saved"));
    }
    setSaving(false);
  }

  async function handleRotateKey() {
    if (!selectedSite) return;
    setRotating(true);
    setRotateMessage(null);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const updated = await rotateKey(selectedSite.id);
    if (updated) {
      setSites((current) => current.map((site) => (site.id === updated.id ? updated : site)));
      setRotateMessage(t(defaultLocale, "sites.key.rotated"));
    }
    setRotating(false);
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "sites.title")}
          description={t(defaultLocale, "sites.description")}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "sites.title")}
          description={t(defaultLocale, "sites.description")}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <Alert variant="error" title={t(defaultLocale, "sites.error.load")} />
          <Button variant="outline" size="sm" onClick={() => void loadSites()}>
            {t(defaultLocale, "dashboard.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!sites.length || !selectedSite) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "sites.title")}
          description={t(defaultLocale, "sites.description")}
        />
        <div className="px-4 sm:px-6 lg:px-page">
          <EmptyState
            icon={<Globe2 className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "sites.empty.title")}
            description={t(defaultLocale, "sites.empty.description")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(defaultLocale, "sites.title")}
        description={t(defaultLocale, "sites.description")}
        actions={<ConsoleModeBadge />}
      />

      <div className="space-y-4 px-4 sm:px-6 lg:px-page">
        <ConsoleDataModeBanner feature="站点" />
        {!SITES_API_AVAILABLE ? (
          <Alert variant="warning" title="站点配置为 Preview / 演示模式">
            白名单保存、密钥轮换与测试消息仅在浏览器内存中模拟，不会写入 apps/api。真实生效需等待站点
            HTTP 接口接入。
          </Alert>
        ) : null}
        <div className="max-w-sm space-y-2 rounded-card border border-border bg-card p-4 shadow-card">
          <Label htmlFor="site-bot-select">{t(defaultLocale, "sites.selectBot")}</Label>
          <select
            id="site-bot-select"
            className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
            value={selectedBotId}
            onChange={(event) => setSelectedBotId(event.target.value)}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.botId}>
                {site.botName}
              </option>
            ))}
          </select>
        </div>

        {rotateMessage ? <Alert variant="success" title={rotateMessage} /> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <DomainWhitelistCard
            domains={draftDomains}
            saving={saving}
            dirty={dirty}
            saveMessage={saveMessage}
            onChange={setDraftDomains}
            onSave={() => void handleSaveDomains()}
          />
          <div className="space-y-4">
            <EmbedCodeCard embedSnippet={selectedSite.embedSnippet} />
            <SiteKeyCard
              siteKeyPrefix={selectedSite.siteKeyPrefix}
              rotating={rotating}
              onRotate={() => void handleRotateKey()}
            />
          </div>
        </div>

        <TestMessageCard
          allowedDomains={draftDomains.length ? draftDomains : selectedSite.allowedDomains}
          savedDomains={selectedSite.allowedDomains}
          dirty={dirty}
          onTest={(origin, message) => testMessage(selectedSite, { origin, message })}
        />
      </div>
    </div>
  );
}
