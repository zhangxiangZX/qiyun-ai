"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Code2,
  FileText,
  MessageSquareText,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import {
  ADMIN_KPIS,
  AI_ASSISTANT_SEGMENTS,
  CONFIG_PROGRESS,
  KNOWLEDGE_SEGMENTS,
  MEMBER_ACTIVITIES,
  OVERALL_PROGRESS,
  PENDING_INQUIRIES,
  RECENT_KNOWLEDGE_DOCS,
  SELECTION_PAGE_STATS,
  SYSTEM_NOTIFICATIONS,
  WIDGET_STATS,
} from "@/components/dashboard/mocks/admin-data";
import { useRoleDashboardData } from "@/components/dashboard/role-dashboard-shared";
import { RoleCardHeader, RoleDonut, RoleHomeToolbar, RoleKpiStrip } from "@/components/dashboard/role-home-parts";
import {
  mapAdminKpis,
  mapConfigProgress,
  mapPendingInquiries,
} from "@/lib/dashboard/role-dashboard-mappers";
import shared from "@/styles/role-home.module.css";
import styles from "@/styles/admin-home.module.css";

const KPI_ICONS = [MessageSquareText, FileText, Bot, BarChart3, Code2, AlertTriangle];
const NOTIFICATION_TONES = ["orange", "blue", "green", "purple"];

export function AdminDashboardWorkspace() {
  const {
    loading,
    refresh,
    refreshing,
    isPreview,
    overview,
    inquiries,
    assignStats,
    botCount,
    documentCount,
    siteCount,
  } = useRoleDashboardData();

  const kpis = useMemo(
    () =>
      isPreview
        ? ADMIN_KPIS
        : mapAdminKpis({ assignStats, documentCount, botCount, siteCount, overview }),
    [isPreview, assignStats, documentCount, botCount, siteCount, overview],
  );
  const configProgress = useMemo(
    () => (isPreview ? { items: CONFIG_PROGRESS, overall: OVERALL_PROGRESS } : mapConfigProgress({ botCount, documentCount, siteCount })),
    [isPreview, botCount, documentCount, siteCount],
  );
  const pendingInquiries = useMemo(
    () => (isPreview ? PENDING_INQUIRIES : mapPendingInquiries(inquiries)),
    [isPreview, inquiries],
  );

  const knowledgeSegments = useMemo(() => {
    if (isPreview) return KNOWLEDGE_SEGMENTS;
    return [
      { label: "已就绪", value: documentCount, color: "#22c55e" },
      { label: "处理中", value: 0, color: "#f59e0b" },
      { label: "失败", value: 0, color: "#ef4444" },
    ].filter((item) => item.value > 0 || item.label === "已就绪");
  }, [isPreview, documentCount]);

  const assistantSegments = useMemo(() => {
    if (isPreview) return AI_ASSISTANT_SEGMENTS;
    return [
      { label: "在线", value: botCount, color: "#22c55e" },
      { label: "离线", value: 0, color: "#94a3b8" },
    ];
  }, [isPreview, botCount]);

  if (loading && !isPreview) {
    return (
      <div className={shared.page}>
        <Skeleton className="mb-4 h-12 w-full rounded-xl" />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <RoleHomeToolbar compact refreshing={refreshing} onRefresh={refresh} />
      <RoleKpiStrip items={kpis} icons={KPI_ICONS} tones={["blue", "green", "purple", "orange", "cyan", "red"]} />

      <section className={styles.firstGrid}>
        <article className={shared.card}>
          <RoleCardHeader title="配置进度概览 ⓘ" />
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead><tr><th>配置项</th><th>完成进度</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>{configProgress.items.map((item, index) => (
                <tr key={item.id}>
                  <td><span className={styles.configName}><i data-tone={item.statusTone}>{index + 1}</i>{item.name}</span></td>
                  <td><span className={shared.progress} data-tone={item.statusTone === "done" ? "green" : "orange"}><b>{item.progress}%</b><i><em style={{ width: `${item.progress}%` }} /></i></span></td>
                  <td><span className={styles.configStatus} data-tone={item.statusTone}>{item.status}</span></td>
                  <td><Link href={item.actionHref ?? "/dashboard/settings"}>{item.actionLabel}</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className={styles.overall}><b>总体完成度：{configProgress.overall}%</b><i><em style={{ width: `${configProgress.overall}%` }} /></i></div>
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="待分配询盘列表" action={<Link href="/dashboard/inquiries/assign">查看全部</Link>} />
          <div className={shared.tableWrap}>
            {pendingInquiries.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">暂无待分配询盘</p>
            ) : (
              <table className={shared.table}>
                <thead><tr><th>询盘内容</th><th>来源渠道</th><th>询盘时间</th><th>优先级</th><th>操作</th></tr></thead>
                <tbody>{pendingInquiries.map((item) => (
                  <tr key={item.id}><td><strong>{item.content}</strong></td><td>{item.sourceChannel}</td><td>{item.createdAt}</td><td><span className={styles.priority} data-tone={item.priorityTone}><i />{item.priority}</span></td><td><Link href={item.actionHref}>分配</Link></td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </article>
      </section>

      <section className={styles.statusGrid}>
        <article className={shared.card}>
          <RoleCardHeader title="知识库更新状态" action={<Link href="/dashboard/knowledge-bases">查看更多</Link>} />
          <div className={styles.knowledgeBody}>
            <div className={styles.donutWithLegend}>
              <RoleDonut segments={knowledgeSegments} label={String(documentCount || (isPreview ? "1,268" : 0))} sublabel="总文档数" size={116} />
              <ul className={shared.legend}>{knowledgeSegments.map((item) => <li key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><b>{item.value}</b></li>)}</ul>
            </div>
            {isPreview ? (
              <div className={styles.recentDocs}><b>最近更新的文档</b>{RECENT_KNOWLEDGE_DOCS.slice(0, 3).map((doc) => <Link key={doc.id} href="/dashboard/knowledge-bases"><span>{doc.title}</span><time>{doc.updatedAt}</time></Link>)}</div>
            ) : null}
          </div>
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="AI助手运行状态" action={<Link href="/dashboard/bots/config">查看更多</Link>} />
          <div className={styles.assistantBody}>
            <RoleDonut segments={assistantSegments} label={String(botCount)} sublabel="助手总数" size={116} />
            <ul className={shared.legend}>{assistantSegments.map((item) => <li key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><b>{item.value}</b></li>)}</ul>
          </div>
          <div className={styles.assistantStats}><span>已配置助手 <b>{botCount}</b></span><span>知识库文档 <b>{documentCount}</b></span></div>
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="官网Widget与选型页状态" action={<Link href="/dashboard/sites">配置管理</Link>} />
          <div className={styles.productStatus}>
            <StatusProduct icon={<Code2 size={17} />} title="官网Widget" stats={[["已安装站点", isPreview ? WIDGET_STATS.installedSites : siteCount], ["有效询盘", overview?.effectiveInquiries ?? 0], ["高意向", overview?.highIntentCount ?? 0]]} href="/dashboard/sites" />
            <StatusProduct icon={<BarChart3 size={17} />} title="选型页" stats={[["今日访问量", isPreview ? SELECTION_PAGE_STATS.todayVisits : "—"], ["今日线索数", isPreview ? SELECTION_PAGE_STATS.todayLeads : overview?.effectiveInquiries ?? 0], ["转化率", isPreview ? SELECTION_PAGE_STATS.conversionRate : "—"]]} href="/dashboard/bots/landing" />
          </div>
        </article>
      </section>

      {isPreview ? (
        <section className={styles.lastGrid}>
          <article className={shared.card}>
            <RoleCardHeader title="成员活跃情况（近7天）" action={<Link href="/dashboard/team">查看全部</Link>} />
            <div className={shared.tableWrap}><table className={shared.table}><thead><tr><th>成员</th><th>角色</th><th>登录次数</th><th>处理询盘数</th><th>知识库更新</th><th>活跃天数</th></tr></thead><tbody>{MEMBER_ACTIVITIES.map((item) => <tr key={item.id}><td><span className={styles.member}><span className={shared.avatar}>{item.name[0]}</span><b>{item.name}</b></span></td><td>{item.role}</td><td>{item.loginCount}</td><td>{item.inquiriesHandled}</td><td>{item.knowledgeUpdates}</td><td><span className={styles.activityBars}>{Array.from({ length: 7 }, (_, i) => <i key={i} data-active={i < item.activeDays} />)}</span></td></tr>)}</tbody></table></div>
          </article>

          <article className={shared.card}>
            <RoleCardHeader title="系统通知" action={<button className={styles.readAll}>全部标为已读</button>} />
            <ul className={styles.notifications}>{SYSTEM_NOTIFICATIONS.map((item, index) => <li key={item.id}><span className={styles.noticeIcon} data-tone={NOTIFICATION_TONES[index]}>{index === 2 ? <CheckCircle2 size={14} /> : index + 1}</span><span><b>{item.title}</b><small>{item.description}</small></span><time>{item.time}</time><em>{item.isRead ? "已读" : "未读"}</em></li>)}</ul>
          </article>
        </section>
      ) : null}
    </div>
  );
}

function StatusProduct({ icon, title, stats, href }: { icon: React.ReactNode; title: string; stats: Array<[string, string | number]>; href: string }) {
  return <div className={styles.statusProduct}><h3><span>{icon}</span>{title}<em>正常运行</em></h3><dl>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{typeof value === "number" ? value.toLocaleString() : value}</dd></div>)}</dl><Link href={href}>查看详情</Link></div>;
}
