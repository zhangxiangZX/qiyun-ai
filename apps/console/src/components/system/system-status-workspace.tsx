"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  CircleHelp,
  CloudOff,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Workflow,
} from "lucide-react";

import { Alert, Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { PreviewModeNotice } from "@/components/console/preview-mode-notice";
import { fetchAuthSession } from "@/lib/auth/client";
import { fetchSystemStatus } from "@/lib/system-status/api";
import {
  overallHealthLabel,
  overallHealthTone,
  resolveApiDriverLabel,
  resolveHealthFormatDescription,
  resolveIncompleteHealthNotice,
  resolveServiceAbnormalHint,
  resolveServiceInfoNote,
  statusLabel,
  statusVariant,
  summarizeServiceStatuses,
} from "@/lib/system-status/display";
import {
  SERVICE_GROUPS,
  type SystemServiceStatus,
} from "@/lib/system-status/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import { memberRoleLabel } from "@/components/team/workspace-access-shared";

const SERVICE_ICONS: Record<string, typeof Server> = {
  api: Server,
  postgres: Database,
  redis: Workflow,
  qdrant: Activity,
  minio: HardDrive,
  embedding: Brain,
};

function ServiceStatusCard({ service }: { service: SystemServiceStatus }) {
  const Icon = SERVICE_ICONS[service.id] ?? CircleHelp;
  const hint = resolveServiceAbnormalHint(service);
  const infoNote = resolveServiceInfoNote(service);
  const accentClass =
    service.status === "healthy"
      ? "border-l-success"
      : service.status === "degraded"
        ? "border-l-warning"
        : service.status === "unreachable"
          ? "border-l-destructive"
          : service.status === "preview"
            ? "border-l-muted-foreground/40"
            : "border-l-border";

  return (
    <article
      className={`rounded-card border border-border border-l-4 bg-card p-4 shadow-card transition-shadow hover:shadow-[0_8px_24px_rgba(18,102,255,0.06)] ${accentClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{service.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {service.detail}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant(service.status)} className="shrink-0">
          {statusLabel(service.status)}
        </Badge>
      </div>
      {infoNote ? (
        <div className="mt-3 rounded-control border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
          <p className="font-medium text-foreground">{infoNote.title}</p>
          <p className="mt-1 text-muted-foreground">{infoNote.message}</p>
        </div>
      ) : null}
      {hint ? (
        <div className="mt-3 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5 text-sm">
          <p className="font-medium text-foreground">{hint.title}</p>
          <p className="mt-1 text-muted-foreground">{hint.message}</p>
          {hint.action ? (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">建议：</span>
              {hint.action}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

type LoadState = "loading" | "ready" | "error" | "refreshing";

export function SystemStatusWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<
    ReturnType<typeof fetchSystemStatus>
  > | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    setLoadState(mode === "refresh" ? "refreshing" : "loading");
    setErrorMessage(null);
    setRefreshNotice(null);

    try {
      const [status, session] = await Promise.all([
        fetchSystemStatus(),
        fetchAuthSession().catch(() => null),
      ]);
      const workspace = session?.workspaces.find((item) => item.isActive) ?? null;
      setWorkspaceName(workspace?.name ?? null);
      setWorkspaceRole(workspace?.role ?? null);
      setSnapshot(status);
      setLoadState("ready");
      if (mode === "refresh") {
        setRefreshNotice(`已于 ${new Date().toLocaleTimeString("zh-CN")} 刷新探测结果。`);
      }
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "无法加载系统状态。",
      );
      setSnapshot(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const groupedServices = useMemo(() => {
    if (!snapshot) return [];

    return SERVICE_GROUPS.map((group) => ({
      ...group,
      services: group.serviceIds
        .map((id) => snapshot.services.find((service) => service.id === id))
        .filter((service): service is SystemServiceStatus => Boolean(service)),
    })).filter((group) => group.services.length > 0);
  }, [snapshot]);

  const pageHeader = (
    <PageHeader
      variant="compact"
      eyebrow="运维"
      title="系统状态"
      description="查看当前运行模式、服务连通性与依赖组件状态，便于运维巡检。"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={loadState === "refreshing"}
            disabled={loadState === "loading"}
            onClick={() => void load("refresh")}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            刷新探测
          </Button>
          <ConsoleModeBadge />
        </div>
      }
    />
  );

  if (loadState === "loading") {
    return (
      <ConsolePage>
        {pageHeader}
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="系统状态" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[100px] rounded-card" />
            ))}
          </div>
        </ConsolePageAlerts>
        <ConsolePageSection className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] rounded-card" />
          ))}
        </ConsolePageSection>
      </ConsolePage>
    );
  }

  if (loadState === "error") {
    return (
      <ConsolePage>
        {pageHeader}
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="系统状态" />
          <ConsoleRequestError
            message={errorMessage ?? "无法加载系统状态。"}
            onRetry={() => void load("initial")}
            retryLabel="重新加载"
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  if (!snapshot) {
    return (
      <ConsolePage>
        {pageHeader}
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="系统状态" />
          <ConsoleEmptyState
            preset="noMatches"
            title="暂无状态数据"
            description="请稍后重试或检查 Console BFF 是否正常运行。"
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  const summary = summarizeServiceStatuses(snapshot.services);
  const healthTone = overallHealthTone(summary, snapshot.mode);
  const healthLabel = overallHealthLabel(summary, snapshot.mode);
  const incompleteHealthNotice = resolveIncompleteHealthNotice(snapshot);

  return (
    <ConsolePage>
      {pageHeader}

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="系统状态" />
        {refreshNotice ? (
          <Alert variant="success" title="探测已更新">
            {refreshNotice}
          </Alert>
        ) : null}
        {incompleteHealthNotice ? (
          <Alert variant="warning" title="健康探测结果不完整">
            {incompleteHealthNotice}
          </Alert>
        ) : null}
        {snapshot.mode === "upstream" && summary.hasIssue && !incompleteHealthNotice ? (
          <Alert variant="warning" title="部分依赖需要关注">
            {summary.degraded > 0 ? `${summary.degraded} 项降级；` : ""}
            {summary.unreachable > 0 ? `${summary.unreachable} 项不可达；` : ""}
            {summary.unknown > 0 ? `${summary.unknown} 项待确认。` : ""}
            请查看下方分组详情与修复建议。
          </Alert>
        ) : null}
      </ConsolePageAlerts>

      <ConsolePageSection className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            emphasis="metric"
            label="整体状态"
            value={healthLabel}
            description={
              snapshot.mode === "preview"
                ? "Preview 模式，下方为能力说明而非实时探针"
                : `${summary.healthy}/${summary.total} 项正常`
            }
            tone={healthTone === "danger" ? "warning" : healthTone === "warning" ? "warning" : "default"}
          />
          <StatCard
            emphasis="metric"
            label="运行模式"
            value={snapshot.mode === "upstream" ? "真实 API" : "演示模式"}
            description={snapshot.modeMessage}
          />
          <StatCard
            emphasis="metric"
            label="上游 API"
            value={
              snapshot.mode === "preview"
                ? "未配置"
                : snapshot.upstreamReachable
                  ? "可达"
                  : "不可达"
            }
            description={
              snapshot.apiDriver
                ? resolveApiDriverLabel(snapshot.apiDriver)
                : "通过后端健康检查探测"
            }
            tone={
              snapshot.upstreamReachable === false && snapshot.mode === "upstream"
                ? "warning"
                : "default"
            }
          />
          <StatCard
            emphasis="metric"
            label="当前工作区"
            value={workspaceName ?? "未选择"}
            description={
              workspaceRole
                ? `${memberRoleLabel(workspaceRole)} · ${snapshot.workspaceNote}`
                : snapshot.workspaceNote
            }
          />
        </div>

        <PreviewModeNotice
          title="健康检查说明"
          message={resolveHealthFormatDescription(snapshot.healthFormat)}
        />

        {snapshot.mode === "upstream" ? (
          <Alert variant="info" title="探测范围说明">
            本页反映后端最近一次健康检查结果；文档处理队列与向量化时序仍取决于后台任务配置，不替代完整监控平台。
          </Alert>
        ) : null}

        <section className="rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-4">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-foreground">服务健康概览</h2>
              <p className="text-xs text-muted-foreground">面向运维巡检的依赖状态面板</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              正常 {summary.healthy} · 降级 {summary.degraded} · 不可达 {summary.unreachable} ·
              待确认 {summary.unknown}
              {summary.preview > 0 ? ` · 演示 ${summary.preview}` : ""}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {snapshot.mode === "upstream"
              ? "状态来自后端健康检查；「未启用」表示当前环境下该项检查被跳过。"
              : "演示模式下展示各组件的能力边界说明，不代表真实基础设施连通性。"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Console 检查：{new Date(snapshot.checkedAt).toLocaleString("zh-CN")}
            {snapshot.upstreamCheckedAt
              ? ` · 上游探测：${new Date(snapshot.upstreamCheckedAt).toLocaleString("zh-CN")}`
              : ""}
          </p>

          <div className="mt-5 space-y-6">
            {groupedServices.length === 0 ? (
              <ConsoleEmptyState
                preset="noMatches"
                title="暂无服务探测数据"
                description="健康检查未返回可展示的服务项，请稍后刷新或联系运维。"
              />
            ) : (
              groupedServices.map((group) => (
                <div key={group.id}>
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="space-y-3">
                    {group.services.map((service) => (
                      <ServiceStatusCard key={service.id} service={service} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {snapshot.mode === "preview" ? (
          <div className="flex items-start gap-3 rounded-card border border-dashed border-warning/40 bg-warning/5 p-4 text-sm text-muted-foreground">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            <p>
              当前为演示模式，上方「演示」状态表示控制台未连接真实基础设施。配置上游 API
              地址后可查看真实的健康检查结果。
            </p>
          </div>
        ) : null}
      </ConsolePageSection>
    </ConsolePage>
  );
}
