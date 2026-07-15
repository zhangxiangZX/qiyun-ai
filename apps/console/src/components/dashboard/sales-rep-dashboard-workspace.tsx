"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckSquare2,
  CircleDollarSign,
  Clock3,
  Copy,
  FileText,
  MessageSquareText,
  PackageCheck,
  QrCode,
  ShoppingBag,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { MiniLineChart } from "@/components/dashboard/charts/mini-line-chart";
import {
  CALENDAR_EVENTS,
  HIGH_INTENT_CUSTOMERS,
  MY_SALES_LINKS,
  MY_TODOS,
  RECENT_FOLLOWUPS,
  SALES_KPIS,
  SALES_TREND_DONE,
  SALES_TREND_LABELS,
  SALES_TREND_NEW,
} from "@/components/dashboard/mocks/sales-data";
import { useRoleDashboardData } from "@/components/dashboard/role-dashboard-shared";
import { RoleCardHeader, RoleHomeToolbar, RoleKpiStrip } from "@/components/dashboard/role-home-parts";
import {
  mapHighIntentCustomers,
  mapMySalesLinks,
  mapSalesKpis,
  mapSalesTodos,
  mapSalesTrendSeries,
} from "@/lib/dashboard/role-dashboard-mappers";
import shared from "@/styles/role-home.module.css";
import styles from "@/styles/sales-home.module.css";

const KPI_ICONS = [MessageSquareText, CheckSquare2, FileText, Clock3, CircleDollarSign, ShoppingBag];
const TODO_TONES: Record<string, string> = { 跟进: "orange", 报价: "blue", 回复: "green", 准备: "purple" };

export function SalesRepDashboardWorkspace() {
  const {
    loading,
    refresh,
    refreshing,
    isPreview,
    snapshot,
    overview,
    inquiries,
    salesLinks,
  } = useRoleDashboardData();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const kpis = useMemo(
    () => (isPreview ? SALES_KPIS : mapSalesKpis(inquiries, overview)),
    [isPreview, inquiries, overview],
  );
  const todos = useMemo(
    () => (isPreview ? MY_TODOS : mapSalesTodos(inquiries)),
    [isPreview, inquiries],
  );
  const trend = useMemo(
    () =>
      isPreview
        ? { labels: SALES_TREND_LABELS, newInquiries: SALES_TREND_NEW, followed: SALES_TREND_DONE }
        : mapSalesTrendSeries(snapshot),
    [isPreview, snapshot],
  );
  const highIntentCustomers = useMemo(
    () => (isPreview ? HIGH_INTENT_CUSTOMERS : mapHighIntentCustomers(inquiries)),
    [isPreview, inquiries],
  );
  const mySalesLinks = useMemo(
    () => (isPreview ? MY_SALES_LINKS : mapMySalesLinks(salesLinks)),
    [isPreview, salesLinks],
  );

  function copyLink(id: string, url: string) {
    void navigator.clipboard?.writeText(url);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

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
      <RoleHomeToolbar refreshing={refreshing} onRefresh={refresh} />
      <RoleKpiStrip items={kpis} icons={KPI_ICONS} tones={["blue", "green", "orange", "purple", "cyan", "red"]} />

      <section className={styles.topGrid}>
        <article className={shared.card}>
          <RoleCardHeader title="我的待办" />
          <ul className={styles.todoList}>
            {todos.length === 0 ? (
              <li className="px-2 py-4 text-sm text-muted-foreground">暂无待办事项</li>
            ) : (
              todos.map((todo) => (
                <li key={todo.id}>
                  <span className={styles.todoType} data-tone={TODO_TONES[todo.type]}>{todo.type}</span>
                  <span className={styles.todoMain}><b>{todo.title}</b><small>{todo.company ? `来自：${todo.company}` : "来自：独立站"}</small></span>
                  <span className={styles.todoMeta}><time>{todo.time}</time><b data-priority={todo.priority}>{todo.priority}</b></span>
                </li>
              ))
            )}
          </ul>
          <Link className={styles.cardFooterLink} href="/dashboard/tasks">查看全部待办 ({todos.length})</Link>
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="我的跟进日历" action={<div className={shared.tabs}><button data-active="true">日</button><button>周</button></div>} />
          {isPreview ? (
            <>
              <div className={styles.calendarDate}>‹ <b>2024年6月1日 星期六</b> ›</div>
              <ol className={styles.timeline}>
                {CALENDAR_EVENTS.map((event) => (
                  <li key={event.id} data-tone={event.statusTone}>
                    <time>{event.time}</time><i />
                    <span><b>{event.title}</b><small>{event.company || `来自：${event.source}`}</small></span>
                    <em>{event.status}</em>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              日程数据请前往<Link href="/dashboard/calendar" className="text-primary">跟进日历</Link>查看。
            </p>
          )}
          <Link className={styles.cardFooterLink} href="/dashboard/calendar">查看完整日程</Link>
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="我的询盘趋势" action={<div className={shared.tabs}><button data-active="true">近7天⌄</button></div>} />
          <div className={styles.chartWrap}>
            <MiniLineChart
              series={[{ label: "新询盘", data: trend.newInquiries, color: "#1768f2" }, { label: "已跟进", data: trend.followed, color: "#0aaa58" }]}
              labels={trend.labels}
              width={430}
              height={220}
              showYAxis
            />
          </div>
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={shared.card}>
          <RoleCardHeader title="高意向客户" action={<Link href="/dashboard/inquiries">查看全部</Link>} />
          <ol className={styles.customerList}>
            {highIntentCustomers.length === 0 ? (
              <li className="px-2 py-4 text-sm text-muted-foreground">暂无高意向客户</li>
            ) : (
              highIntentCustomers.map((customer) => (
                <li key={customer.name}>
                  <span className={styles.customerRank}>{customer.rank}</span>
                  <b>{customer.name}</b>
                  <span className={styles.intent} data-level={customer.intentLevel}>{customer.intentLevel}</span>
                  <small>最后跟进：{customer.lastContactTime}</small>
                  <strong>{customer.amount}</strong>
                </li>
              ))
            )}
          </ol>
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="最近跟进记录" action={<Link href="/dashboard/tasks">查看全部</Link>} />
          {isPreview ? (
            <ul className={styles.followList}>
              {RECENT_FOLLOWUPS.map((record, index) => (
                <li key={record.id}>
                  <span className={shared.avatar}>{["张", "王", "李", "陈", "赵"][index]}</span>
                  <span><b>{record.customerName}</b><small>{record.action}</small></span>
                  <time>{record.time}</time>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.followList}>
              {inquiries.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <span className={shared.avatar}>{item.customerName.slice(0, 1)}</span>
                  <span><b>{item.customerName}</b><small>{item.summary?.slice(0, 40) ?? "询盘跟进"}</small></span>
                  <time>{new Date(item.updatedAt).toLocaleString("zh-CN")}</time>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={shared.card}>
          <RoleCardHeader title="我的销售链接" action={<Link href="/dashboard/channels/links">管理链接</Link>} />
          <div className={styles.salesLinks}>
            {mySalesLinks.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">暂无销售链接，<Link href="/dashboard/channels/links/new" className="text-primary">去创建</Link></p>
            ) : (
              mySalesLinks.map((item) => (
                <div className={styles.salesLinkCard} key={item.id}>
                  <div className={styles.linkInfo}>
                    <h3>{item.name}<span>{item.status === "active" ? "已启用" : "已停用"}</span></h3>
                    <p>{item.url}</p>
                    <dl><div><dt>浏览量</dt><dd>{item.visits}</dd></div><div><dt>询盘数</dt><dd>{item.conversions}</dd></div><div><dt>转化数</dt><dd>{item.downloads}</dd></div></dl>
                  </div>
                  <QrCode className={styles.qrCode} aria-label="二维码" />
                  <button type="button" onClick={() => copyLink(item.id, item.url)}><Copy size={12} />{copiedId === item.id ? "已复制" : "复制链接"}</button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <p className={styles.tip}><PackageCheck size={15} /> 小贴士：及时跟进客户，提高转化率！</p>
    </div>
  );
}
