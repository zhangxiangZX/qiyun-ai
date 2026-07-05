"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { AnalyticsDataFootnote } from "@/components/dashboard/analytics-data-footnote";
import { DashboardOverviewFilters } from "@/components/dashboard/overview/dashboard-overview-filters";
import { DashboardPanelBody } from "@/components/dashboard/overview/dashboard-panel-body";
import { DashboardOverviewIcon } from "@/components/dashboard/overview/dashboard-overview-icons";
import { DashboardOverviewTrendChart } from "@/components/dashboard/overview/dashboard-overview-trend-chart";
import type { BotListItem } from "@/lib/bots/types";
import { listAllConversations } from "@/lib/conversations/api";
import type { ConversationListItem } from "@/lib/conversations/types";
import {
  buildOverviewChats,
  buildOverviewKpis,
  buildOverviewLeads,
  buildOverviewRobots,
  buildChannelSegments,
  getChannelTotalLabel,
  hasChannelDistribution,
} from "@/lib/dashboard/overview-display";
import { UnresolvedQuestionsPanel } from "@/components/dashboard/unresolved-questions-panel";
import { resolvePanelContentKind, type PanelLoadState } from "@/lib/dashboard/panel-load-state";
import type { DashboardSnapshot, TrendRange } from "@/lib/dashboard/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import styles from "@/styles/dashboard-overview.module.css";

const quickActions = [
  { label: "创建知识库", icon: "book", href: "/dashboard/knowledge-bases" },
  { label: "上传资料", icon: "upload", href: "/dashboard/knowledge-bases" },
  { label: "创建机器人", icon: "robot", href: "/dashboard/bots" },
  { label: "对话测试", icon: "chat", href: "/dashboard/sites" },
  { label: "线索管理", icon: "users", href: "/dashboard/leads" },
  { label: "数据分析", icon: "bars", href: "/dashboard/reports" },
  { label: "站点接入", icon: "pulse", href: "/dashboard/sites" },
  { label: "系统设置", icon: "settings", href: "/dashboard/team" },
] as const;

export interface DashboardOverviewViewProps {
  snapshot: DashboardSnapshot;
  dateRange: string;
  dateRangeOptions: string[];
  robotFilter: string;
  bots: BotListItem[];
  upstreamFiltersEnabled: boolean;
  onDateRangeChange: (value: string) => void;
  onRobotFilterChange: (value: string) => void;
}

export function DashboardOverviewView({
  snapshot,
  dateRange,
  dateRangeOptions,
  robotFilter,
  bots,
  upstreamFiltersEnabled,
  onDateRangeChange,
  onRobotFilterChange,
}: DashboardOverviewViewProps) {
  const router = useRouter();
  const [trendRange, setTrendRange] = useState<TrendRange>(7);
  const [botsState, setBotsState] = useState<PanelLoadState>("loading");
  const [botsError, setBotsError] = useState<unknown>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationsState, setConversationsState] = useState<PanelLoadState>("loading");
  const [conversationsError, setConversationsError] = useState<unknown>(null);

  const loadBotsPanel = useCallback(async () => {
    setBotsState("ready");
    setBotsError(null);
  }, []);

  const loadConversationsPanel = useCallback(async () => {
    setConversationsState("loading");
    setConversationsError(null);
    try {
      const data = await listAllConversations();
      setConversations(data);
      setConversationsState("ready");
    } catch (error) {
      setConversations([]);
      setConversationsError(error);
      setConversationsState("error");
    }
  }, []);

  useEffect(() => {
    void loadBotsPanel();
    void loadConversationsPanel();
  }, [loadBotsPanel, loadConversationsPanel]);

  const kpis = useMemo(() => buildOverviewKpis(snapshot), [snapshot]);
  const trendData = trendRange === 7 ? snapshot.trend7 : snapshot.trend30;
  const robotRows = useMemo(() => {
    const rows = buildOverviewRobots(bots);
    if (robotFilter === "全部机器人") return rows;
    return rows.filter((row) => row.name === robotFilter);
  }, [bots, robotFilter]);
  const chatRows = useMemo(() => buildOverviewChats(conversations), [conversations]);
  const leadRows = useMemo(() => buildOverviewLeads(snapshot.recentLeads), [snapshot.recentLeads]);
  const channelSegments = useMemo(() => buildChannelSegments(snapshot), [snapshot]);
  const channelTotal = getChannelTotalLabel(snapshot);
  const channelHasData = hasChannelDistribution(snapshot);
  const robotOptions = useMemo(() => {
    const names = buildOverviewRobots(bots).map((row) => row.name);
    return ["全部机器人", ...names];
  }, [bots]);
  const unresolvedBotOptions = useMemo(() => {
    const fromBots = buildOverviewRobots(bots).map((row) => row.name);
    const fromUnresolved = snapshot.unresolvedQuestions.map((item) => item.botName);
    return [...new Set([...fromBots, ...fromUnresolved])];
  }, [bots, snapshot.unresolvedQuestions]);
  const botsPanelError = resolveRequestErrorPresentation(
    botsError,
    t(defaultLocale, "dashboard.error.botsPanel"),
  );
  const conversationsPanelError = resolveRequestErrorPresentation(
    conversationsError,
    t(defaultLocale, "dashboard.error.conversationsPanel"),
  );
  const botsPanelKind = resolvePanelContentKind(botsState, robotRows.length);
  const conversationsPanelKind = resolvePanelContentKind(conversationsState, chatRows.length);
  const leadsPanelKind = leadRows.length === 0 ? ("empty" as const) : ("ready" as const);
  const trendHasData = trendData.length > 0;

  return (
    <section className={styles.content}>
      <div className={styles.bannerRowVisible}>
        <ConsoleDataModeBanner feature="概览" />
        <AnalyticsDataFootnote feature="dashboard" />
      </div>

      <DashboardOverviewFilters
        dateRange={dateRange}
        dateRangeOptions={dateRangeOptions}
        robotFilter={robotFilter}
        robotOptions={robotOptions}
        dateRangeDisabled={!upstreamFiltersEnabled}
        onDateRangeChange={onDateRangeChange}
        onRobotFilterChange={onRobotFilterChange}
      />

      <section className={`${styles.kpiSection} ${styles.kpiGrid}`}>
        {kpis.map((item) => (
          <article className={styles.kpiCard} key={item.id}>
            <div className={styles.kpiBody}>
              <p>{item.title}</p>
              <strong className={item.value === "—" ? styles.kpiEmpty : undefined}>{item.value}</strong>
              <small className={item.trend.includes("—") ? styles.kpiMuted : item.good ? styles.good : styles.bad}>
                {item.trend}
              </small>
            </div>
            <span className={`${styles.kpiIcon} ${styles[item.tone]}`}>
              <DashboardOverviewIcon name={item.icon} />
            </span>
          </article>
        ))}
      </section>

      <section className={styles.midGrid}>
        <article className={`${styles.card} ${styles.trendCard}`}>
          <div className={styles.cardHeader}>
            <h2>会话趋势</h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={trendRange === 7 ? styles.rangeActive : ""}
                onClick={() => setTrendRange(7)}
              >
                近7天
              </button>
              <button
                type="button"
                className={trendRange === 30 ? styles.rangeActive : ""}
                onClick={() => setTrendRange(30)}
              >
                近30天
              </button>
              <button type="button" onClick={() => router.push("/dashboard/reports")}>
                导出 ›
              </button>
            </div>
          </div>
          <div className={styles.legend}>
            <span className={styles.legendBlue}>●</span> 会话数
            <span className={styles.legendGreen}>●</span> 线索数
          </div>
          <DashboardPanelBody
            state={trendHasData ? "ready" : "empty"}
            emptyTitle="暂无趋势数据"
            emptyDescription="开始接待访客后，近 7 天 / 近 30 天的会话与线索趋势会显示在这里。"
            className={styles.chartWrap}
          >
            <DashboardOverviewTrendChart data={trendData} revision={trendRange} />
          </DashboardPanelBody>
        </article>

        <article className={`${styles.card} ${styles.sourceCard}`}>
          <div className={styles.cardHeader}>
            <h2>渠道来源分布</h2>
          </div>
          <div className={styles.sourceBody}>
            <DashboardPanelBody
              state={channelHasData ? "ready" : "empty"}
              emptyTitle="暂无渠道数据"
              emptyDescription="接入 Widget 并产生会话后，各来源渠道的占比会显示在这里。"
            >
              <>
                <div className={styles.donut}>
                  <div>
                    <strong>{channelTotal}</strong>
                    <span>总会话数</span>
                  </div>
                </div>
                <ul>
                  {channelSegments.map((segment) => (
                    <li key={segment.label}>
                      <span className={styles[segment.className as keyof typeof styles]} />
                      {segment.label} <b>{segment.percent}%</b>
                    </li>
                  ))}
                </ul>
              </>
            </DashboardPanelBody>
          </div>
        </article>

        <article className={`${styles.card} ${styles.robotCard}`}>
          <div className={styles.cardHeader}>
            <h2>机器人运行状态</h2>
            <button type="button" onClick={() => router.push("/dashboard/bots")}>
              全部机器人 ›
            </button>
          </div>
          <div className={styles.robotList}>
            <DashboardPanelBody
              state={botsPanelKind === "loading" ? "loading" : botsPanelKind === "error" ? "error" : botsPanelKind === "empty" ? "empty" : "ready"}
              error={botsError}
              errorFallback={botsPanelError.message}
              onRetry={() => void loadBotsPanel()}
              retryLabel={t(defaultLocale, "dashboard.error.retry")}
              emptyTitle="暂无机器人"
              emptyDescription="创建并启用机器人后，运行状态会显示在这里。"
              skeletonRows={4}
            >
              {robotRows.map((row) => (
                <div className={styles.robotRow} key={row.id}>
                  <span className={styles.robotAvatar}>
                    <DashboardOverviewIcon name="robot" />
                  </span>
                  <div className={styles.robotName}>
                    <b>{row.name}</b>
                    <small className={row.online ? styles.online : styles.offline}>● {row.status}</small>
                  </div>
                  <div>
                    <small>会话数</small>
                    <b>{row.sessions}</b>
                  </div>
                  <div>
                    <small>命中率</small>
                    <b>{row.accuracy}</b>
                  </div>
                </div>
              ))}
            </DashboardPanelBody>
          </div>
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={`${styles.card} ${styles.listCard}`}>
          <div className={styles.cardHeader}>
            <h2>最近会话</h2>
            <button type="button" onClick={() => router.push("/dashboard/conversations")}>
              查看全部 ›
            </button>
          </div>
          <div className={styles.chatList}>
            <DashboardPanelBody
              state={
                conversationsPanelKind === "loading"
                  ? "loading"
                  : conversationsPanelKind === "error"
                    ? "error"
                    : conversationsPanelKind === "empty"
                      ? "empty"
                      : "ready"
              }
              error={conversationsError}
              errorFallback={conversationsPanelError.message}
              onRetry={() => void loadConversationsPanel()}
              retryLabel={t(defaultLocale, "dashboard.error.retry")}
              emptyTitle="暂无最近会话"
              emptyDescription="访客开始对话后，最新会话摘要会显示在这里。"
              skeletonRows={4}
            >
              {chatRows.map((row, index) => (
                <button
                  type="button"
                  className={styles.chatRow}
                  key={row.id}
                  onClick={() => router.push(`/dashboard/conversations?highlight=${encodeURIComponent(row.id)}`)}
                >
                  <span className={`${styles.personAvatar} ${styles[`av${index}` as keyof typeof styles] ?? styles.av0}`}>
                    {row.name.slice(0, 1)}
                  </span>
                  <span className={styles.chatContent}>
                    <b>
                      {row.name} {row.online ? <i /> : null}
                    </b>
                    <small>{row.message}</small>
                  </span>
                  <span className={styles.chatMeta}>
                    <em>{row.botName}</em>
                    <span>{row.time}</span>
                    {row.unread ? <u>{row.unread}</u> : null}
                  </span>
                </button>
              ))}
            </DashboardPanelBody>
          </div>
        </article>

        <article className={`${styles.card} ${styles.listCard}`}>
          <div className={styles.cardHeader}>
            <h2>待跟进线索</h2>
            <button type="button" onClick={() => router.push("/dashboard/leads")}>
              查看全部 ›
            </button>
          </div>
          <div className={styles.leadList}>
            <DashboardPanelBody
              state={leadsPanelKind}
              emptyTitle="暂无待跟进线索"
              emptyDescription="访客留下联系方式后，高意向线索会出现在这里。"
              skeletonRows={3}
            >
              {leadRows.map((row) => (
                <button
                  type="button"
                  className={styles.leadRow}
                  key={row.id}
                  onClick={() => router.push(`/dashboard/leads?highlight=${encodeURIComponent(row.id)}`)}
                >
                  <span>
                    <b>{row.company}</b>
                    <small>{row.need}</small>
                  </span>
                  <em className={row.level === "高意向" ? styles.hotLead : styles.warmLead}>
                    {row.level}
                  </em>
                  <time>{row.time}</time>
                </button>
              ))}
            </DashboardPanelBody>
          </div>
        </article>

        <article className={`${styles.card} ${styles.quickCard}`}>
          <div className={styles.cardHeader}>
            <h2>快捷操作</h2>
          </div>
          <div className={styles.quickGrid}>
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <span>
                  <DashboardOverviewIcon name={action.icon} />
                </span>
                {action.label}
              </Link>
            ))}
          </div>
        </article>
      </section>

      <UnresolvedQuestionsPanel
        className="mt-4"
        items={snapshot.unresolvedQuestions}
        botOptions={unresolvedBotOptions}
      />
    </section>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <section className={styles.content}>
      <div className={styles.bannerRowVisible}>
        <ConsoleDataModeBanner feature="概览" />
        <AnalyticsDataFootnote feature="dashboard" />
      </div>
      <div className={styles.kpiGrid}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`${styles.skeletonBlock} ${styles.kpiCard}`} style={{ minHeight: 131 }} />
        ))}
      </div>
      <div className={styles.midGrid}>
        <div className={`${styles.skeletonBlock} ${styles.card}`} style={{ minHeight: 338 }} />
        <div className={`${styles.skeletonBlock} ${styles.card}`} style={{ minHeight: 338 }} />
        <div className={`${styles.skeletonBlock} ${styles.card}`} style={{ minHeight: 338 }} />
      </div>
      <div className={styles.bottomGrid}>
        <div className={`${styles.skeletonBlock} ${styles.card}`} style={{ minHeight: 341 }} />
        <div className={`${styles.skeletonBlock} ${styles.card}`} style={{ minHeight: 341 }} />
        <div className={`${styles.skeletonBlock} ${styles.card}`} style={{ minHeight: 341 }} />
      </div>
    </section>
  );
}

export function DashboardOverviewError({
  error,
  fallback,
  onRetry,
  retryLabel,
}: {
  error: unknown;
  fallback: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  const { kind, message } = resolveRequestErrorPresentation(error, fallback);

  return (
    <section className={styles.content}>
      <div className={styles.bannerRow}>
        <ConsoleDataModeBanner feature="概览" />
        <AnalyticsDataFootnote feature="dashboard" />
      </div>
      <div className={styles.emptyState}>
        <ConsoleRequestError
          kind={kind}
          message={message}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      </div>
    </section>
  );
}

export function DashboardOverviewEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className={styles.content}>
      <div className={styles.bannerRow}>
        <ConsoleDataModeBanner feature="概览" />
        <AnalyticsDataFootnote feature="dashboard" />
      </div>
      <div className={styles.emptyState}>
        <strong>{title}</strong>
        <p>{description}</p>
        {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
      </div>
    </section>
  );
}
