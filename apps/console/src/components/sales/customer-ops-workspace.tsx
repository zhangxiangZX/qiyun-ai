"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Edit,
  Gift,
  Handshake,
  MoreHorizontal,
  Percent,
  Phone,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { fetchCustomerRecommendations, listCustomerOpportunities } from "@/lib/sales/api";
import type { CustomerOpportunityItem, CustomerRecommendation } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/customer-operations.module.css";

const PAGE_SIZE = 10;

const SEGMENT_META = [
  { id: "awaiting_first_contact", badge: "新", title: "待首次接触", sub: "刚导入，等待跟进", cls: styles.segBlue },
  { id: "collecting_requirements", badge: "需", title: "需求收集中", sub: "正在了解需求", cls: styles.segGreen },
  { id: "quoting", badge: "报", title: "报价中", sub: "已发送报价", cls: styles.segYellow },
  { id: "won_or_repeat", badge: "成", title: "成交/复购", sub: "已成交客户", cls: styles.segPurple },
  { id: "silent_risk", badge: "险", title: "沉默风险", sub: "长期未跟进", cls: styles.segRed },
];

const LIFECYCLE_META = [
  { id: "new", title: "新客户" },
  { id: "active", title: "活跃客户" },
  { id: "risk", title: "沉默风险客户" },
  { id: "won", title: "成交客户" },
];


function GrowthChart() {
  return (
    <div style={{ padding: 32, color: "#9ca3af", textAlign: "center", fontSize: 13 }}>暂无趋势数据</div>
  );
}

function SourceDonut() {
  return (
    <div style={{ padding: 32, color: "#9ca3af", textAlign: "center", fontSize: 13 }}>暂无来源数据</div>
  );
}

function ValueFunnel() {
  return (
    <div style={{ padding: 32, color: "#9ca3af", textAlign: "center", fontSize: 13 }}>暂无漏斗数据</div>
  );
}

function buildRecords(items: CustomerOpportunityItem[], recommendations: CustomerRecommendation[]) {
  if (items.length === 0) return [];
  const fromApi = items.slice(0, 5).map((item, i) => ({
    id: item.id,
    customer: item.customerName,
    plan: recommendations[i]?.title ?? "客户跟进计划",
    type: "电话回访",
    owner: "—",
    executedAt: item.updatedAt.slice(0, 16).replace("T", " "),
    nextAt: item.nextFollowUpAt?.slice(0, 16).replace("T", " ") ?? "—",
    status: item.lifecycleColumn === "won_or_repeat" ? "已完成" : "进行中",
    effect: recommendations[i]?.detail.slice(0, 8) ?? "待跟进",
  }));
  return fromApi;
}

export function CustomerOpsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [items, setItems] = useState<CustomerOpportunityItem[]>([]);
  const [recommendations, setRecommendations] = useState<CustomerRecommendation[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextItems, nextRecommendations] = await Promise.all([
        listCustomerOpportunities(),
        fetchCustomerRecommendations(),
      ]);
      setItems(nextItems);
      setRecommendations(nextRecommendations);
    } catch (nextError) {
      setError(nextError);
      setItems([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const kpis = useMemo(() => {
    const won = items.filter((i) => i.lifecycleColumn === "won_or_repeat").length;
    const active = items.filter((i) => i.lifecycleColumn !== "silent_risk").length;
    return {
      total: items.length,
      active,
      highValue: items.filter((i) => i.lifecycleColumn === "won_or_repeat" || i.lifecycleColumn === "quoting").length,
      newCustomers: items.filter((i) => i.lifecycleColumn === "awaiting_first_contact").length,
      won,
      conversionRate: items.length > 0 ? `${((won / items.length) * 100).toFixed(1)}%` : "0%",
    };
  }, [items]);

  const segmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of SEGMENT_META) counts[s.id] = 0;
    for (const it of items) counts[it.lifecycleColumn] = (counts[it.lifecycleColumn] ?? 0) + 1;
    return counts;
  }, [items]);

  const lifecycleStats = useMemo(() => {
    const c = { new: 0, active: 0, risk: 0, won: 0 };
    for (const it of items) {
      if (it.lifecycleColumn === "awaiting_first_contact") c.new += 1;
      else if (it.lifecycleColumn === "silent_risk") c.risk += 1;
      else if (it.lifecycleColumn === "won_or_repeat") c.won += 1;
      else c.active += 1;
    }
    return c;
  }, [items]);

  const records = useMemo(() => buildRecords(items, recommendations), [items, recommendations]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.customer.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pageRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载客户运营数据…</p>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分数据加载失败，请稍后重试。")} />
      ) : null}

      <div className={styles.pageHeaderRow}>
        <div className={styles.headerActions}>
          <label className={styles.headerSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="搜索客户、联系人、公司、标签..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select className={styles.filterSelect} defaultValue="month">
            <option value="month">本月（2025-05-01 ~ 2025-05-31）</option>
          </select>
          <button type="button" className={styles.btnOutline} disabled title="导出功能即将上线">
            <Download size={14} aria-hidden /> 导出数据
          </button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {[
          { icon: Users, color: "#3b82f6", label: "客户总数", value: kpis.total.toLocaleString("zh-CN"), trend: null },
          { icon: UserCheck, color: "#22c55e", label: "活跃客户", value: kpis.active.toLocaleString("zh-CN"), trend: null },
          { icon: Crown, color: "#f59e0b", label: "高价值客户", value: kpis.highValue.toLocaleString("zh-CN"), trend: null },
          { icon: UserPlus, color: "#06b6d4", label: "新增客户", value: kpis.newCustomers.toLocaleString("zh-CN"), trend: null },
          { icon: Handshake, color: "#22c55e", label: "成交客户", value: kpis.won.toLocaleString("zh-CN"), trend: null },
          { icon: Percent, color: "#8b5cf6", label: "客户转化率", value: kpis.conversionRate, trend: null },
        ].map(({ icon: Icon, color, label, value, trend }) => (
          <div key={label} className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: color }}>
              <Icon size={22} color="#fff" aria-hidden />
            </div>
            <div>
              <div className={styles.kpiHead}>{label}</div>
              <div className={styles.kpiValue}>{value}</div>
              <div className={styles.kpiTrend}>{trend ? `↑ ${trend}` : "—"}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartGrid3}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户增长趋势</h3>
            <span className={styles.cardLink}>
              查看详情
            </span>
          </div>
          <GrowthChart />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户来源分布</h3>
            <span className={styles.cardLink}>
              查看详情
            </span>
          </div>
          <SourceDonut />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户价值分布</h3>
            <span className={styles.cardLink}>
              查看详情
            </span>
          </div>
          <ValueFunnel />
        </div>
      </div>

      <div className={styles.chartGrid3}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户分群</h3>
            <span className={styles.cardLink}>
              查看全部
            </span>
          </div>
          {SEGMENT_META.map((seg) => (
            <div key={seg.id} className={styles.listItem}>
              <div className={styles.listLeft}>
                <div className={`${styles.segBadge} ${seg.cls}`}>{seg.badge}</div>
                <div>
                  <div className={styles.itemTitle}>{seg.title}</div>
                  <div className={styles.itemSub}>{seg.sub}</div>
                </div>
              </div>
              <div className={styles.listRight}>
                <div className={styles.listCount}>{segmentStats[seg.id].toLocaleString("zh-CN")}</div>
                <div className={styles.listPct}>客户阶段</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户生命周期分析</h3>
            <span className={styles.cardLink}>
              查看详情
            </span>
          </div>
          {LIFECYCLE_META.map((item) => (
            <div key={item.id} className={styles.listItem}>
              <div className={styles.itemTitle}>{item.title}</div>
              <div className={styles.listRight}>
                <div className={styles.listCount}>{lifecycleStats[item.id as keyof typeof lifecycleStats].toLocaleString("zh-CN")}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户运营计划</h3>
            <span className={styles.cardLink}>
              创建计划
            </span>
          </div>
          <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>暂无运营计划</div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>客户运营记录</h3>
          <div className={styles.tableFilters}>
            <select className={styles.filterSelect} defaultValue="all">
              <option value="all">全部计划</option>
            </select>
            <select className={styles.filterSelect} defaultValue="all">
              <option value="all">全部类型</option>
            </select>
            <select className={styles.filterSelect} defaultValue="all">
              <option value="all">全部状态</option>
            </select>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="全选" />
                </th>
                <th>客户名称</th>
                <th>运营计划</th>
                <th>运营类型</th>
                <th>负责人</th>
                <th>执行时间</th>
                <th>下次触达时间</th>
                <th>状态</th>
                <th>效果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>
                    暂无运营记录
                  </td>
                </tr>
              )}
              {pageRecords.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input type="checkbox" aria-label={`选择 ${row.customer}`} />
                  </td>
                  <td>{row.customer}</td>
                  <td className={styles.planLink}>{row.plan}</td>
                  <td>{row.type}</td>
                  <td>{row.owner}</td>
                  <td>{row.executedAt}</td>
                  <td>{row.nextAt}</td>
                  <td>
                    <span className={styles.statusGreen}>{row.status}</span>
                  </td>
                  <td>{row.effect}</td>
                  <td>
                    <button type="button" className={styles.actionBtn} aria-label="编辑">
                      <Edit size={14} />
                    </button>
                    <button type="button" className={styles.actionBtn} aria-label="更多">
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>共 {filteredRecords.length.toLocaleString("zh-CN")} 条记录</span>
          <div className={styles.paginationRight}>
            <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={page === num ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                onClick={() => setPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
            <span>{PAGE_SIZE}条/页</span>
          </div>
        </div>
      </div>
    </div>
  );
}
