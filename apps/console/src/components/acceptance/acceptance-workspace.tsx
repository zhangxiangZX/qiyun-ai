"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, ExternalLink } from "lucide-react";

import { Alert, Badge, Button, PageHeader, StatCard } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsolePreviewDemoGuide } from "@/components/console/console-preview-demo-guide";
import { fetchConsoleMode, isUpstreamMode, type ConsoleModeInfo } from "@/lib/api/mode";
import {
  ACCEPTANCE_STORAGE_KEY,
  deploymentWalkthroughGroups,
  upstreamAcceptanceChecklist,
} from "@/lib/acceptance/upstream-checklist";

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ACCEPTANCE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveChecked(next: Record<string, boolean>) {
  window.sessionStorage.setItem(ACCEPTANCE_STORAGE_KEY, JSON.stringify(next));
}

export function AcceptanceWorkspace() {
  const [mode, setMode] = useState<ConsoleModeInfo | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetchConsoleMode().then(setMode).catch(() => setMode(null));
    setChecked(loadChecked());
  }, []);

  const upstream = mode ? isUpstreamMode(mode) : false;
  const visibleItems = useMemo(
    () => upstreamAcceptanceChecklist.filter((item) => !item.upstreamOnly || upstream),
    [upstream],
  );

  const completedCount = visibleItems.filter((item) => checked[item.id]).length;
  const progressLabel = `${completedCount} / ${visibleItems.length}`;

  const toggle = useCallback((id: string) => {
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      saveChecked(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    setChecked({});
    window.sessionStorage.removeItem(ACCEPTANCE_STORAGE_KEY);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleItems>();
    for (const item of visibleItems) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [visibleItems]);

  return (
    <ConsolePage>
      <PageHeader
        variant="compact"
        title="联调验收"
        description="部署后按清单走查 Console 全链路；进度保存在当前浏览器会话。"
        actions={<ConsoleModeBadge />}
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="联调验收" />
        <ConsolePreviewDemoGuide />

        {!upstream ? (
          <Alert variant="warning" title="当前为 Preview 模式">
            配置 <code className="rounded bg-muted px-1">API_BASE_URL</code> 并重启 Console
            后，可使用完整 Upstream 验收清单。下方仍可按演示脚本熟悉页面路径。
          </Alert>
        ) : (
          <Alert variant="success" title="Upstream 模式已就绪">
            上游地址：{mode?.upstreamBaseUrl ?? "已配置"}。任一步出现 401，请先检查 BFF JWT 透传与工作区
            Header。
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            emphasis="metric"
            label="验收进度"
            value={progressLabel}
            description="勾选完成项；刷新页面后进度仍保留于本会话。"
            tone={completedCount === visibleItems.length ? "warning" : "default"}
          />
          <StatCard
            emphasis="metric"
            label="数据模式"
            value={upstream ? "真实 API" : "Preview"}
            description={
              upstream ? "BFF 代理 apps/api，写入会持久化。" : "演示数据，部分写入不会持久化。"
            }
          />
          <StatCard
            emphasis="metric"
            label="清单项"
            value={`${visibleItems.length} 步`}
            description="覆盖鉴权、知识库、聊天、站点、团队与报表。"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={resetProgress}>
            重置进度
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/system-status">打开系统状态</Link>
          </Button>
        </div>
      </ConsolePageAlerts>

      {Array.from(grouped.entries()).map(([group, items]) => (
        <ConsolePageSection key={group}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {deploymentWalkthroughGroups[group as keyof typeof deploymentWalkthroughGroups]}
          </h2>
          <ul className="space-y-3">
            {items.map((item) => {
              const done = Boolean(checked[item.id]);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-card border border-border bg-card p-4 shadow-card"
                >
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-primary"
                    aria-label={done ? "标记为未完成" : "标记为完成"}
                    onClick={() => toggle(item.id)}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" aria-hidden />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={item.href}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {item.label}
                      </Link>
                      {item.upstreamOnly ? (
                        <Badge variant="outline" className="text-xs">
                          Upstream
                        </Badge>
                      ) : null}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </div>
                    {item.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </ConsolePageSection>
      ))}

      <ConsolePageSection>
        <h2 className="mb-4 text-lg font-semibold text-foreground">发布前提示</h2>
        <Alert variant="info" title="全链路走查建议顺序">
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
            <li>确认系统状态页依赖均为 healthy / skipped（非 unreachable）。</li>
            <li>按上方清单逐项勾选；429 限流时等待 Retry 提示后再试。</li>
            <li>站点密钥轮换后务必复制「仅此一次」的 siteKey 与嵌入代码。</li>
            <li>完成全部项后再做客户演示或对外发布。</li>
          </ol>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            与 docs/12-console-backend-gaps.md §9 E2E 脚本对齐。
          </p>
        </Alert>
      </ConsolePageSection>
    </ConsolePage>
  );
}
