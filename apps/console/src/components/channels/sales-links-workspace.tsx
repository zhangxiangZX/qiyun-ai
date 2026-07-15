"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Copy,
  Download,
  Eye,
  HelpCircle,
  Link2,
  MessageSquare,
  Plus,
  QrCode,
  Search,
  TrendingUp,
} from "lucide-react";

import { QrCode as QrCodeComp, Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { listSalesLinks, resolveSalesLinkPublicUrl, type SalesLinkView } from "@/lib/channels/api";
import {
  channelConfig,
  getTopConversionLinks,
  mockScanRecords,
  mockSalesLinks,
  SALES_LINKS_KPIS,
} from "@/lib/channels/links-mock-data";
import styles from "@/styles/sales-links.module.css";

const PREVIEW_LINKS: SalesLinkView[] = mockSalesLinks.map((item, index) => ({
  ...item,
  slug: `preview-${item.id}`,
  targetUrl: null,
  createdAt: `2026-07-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
  updatedAt: `2026-07-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
}));

const CHANNEL_ICONS: Record<string, string> = {
  google_ads: "G",
  zhanli: "站",
  email: "邮",
  douyin: "抖",
  pc: "PC",
  whatsapp: "W",
  linkedin: "in",
};

const PAGE_SIZE = 10;

function ChannelIcon({ channel }: { channel: string }) {
  const color = channelConfig[channel]?.color ?? "#6b7280";
  return (
    <span className={styles.channelIcon} style={{ background: color }}>
      {CHANNEL_ICONS[channel] ?? "?"}
    </span>
  );
}

function CreatorAvatar({ name }: { name: string }) {
  return <span className={styles.avatar}>{name.slice(0, 1)}</span>;
}

export function SalesLinksWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [links, setLinks] = useState<SalesLinkView[]>(PREVIEW_LINKS);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copyNotice, setCopyNotice] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextLinks = await listSalesLinks();
      setLinks(nextLinks);
      setIsPreview(false);
    } catch {
      setLinks(PREVIEW_LINKS);
      setIsPreview(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (typeof window !== "undefined") {
      const saved = window.sessionStorage.getItem("sales-link-saved");
      if (saved === "1") {
        setSavedNotice(true);
        window.sessionStorage.removeItem("sales-link-saved");
      }
    }
  }, []);

  const creators = useMemo(
    () => Array.from(new Set(links.map((link) => link.creator))),
    [links],
  );

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    return links.filter((link) => {
      if (statusFilter !== "all" && link.status !== statusFilter) return false;
      if (channelFilter !== "all" && link.channel !== channelFilter) return false;
      if (creatorFilter !== "all" && link.creator !== creatorFilter) return false;
      if (!lowered) return true;
      return (
        link.name.toLowerCase().includes(lowered) ||
        link.channelLabel.toLowerCase().includes(lowered) ||
        link.shortUrl.toLowerCase().includes(lowered)
      );
    });
  }, [links, query, statusFilter, channelFilter, creatorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const topLinks = getTopConversionLinks(5);
  const maxRate = topLinks[0]?.conversionRate ?? 1;

  const copyLink = (link: SalesLinkView, event?: React.MouseEvent) => {
    event?.stopPropagation();
    void navigator.clipboard?.writeText(resolveSalesLinkPublicUrl(link));
    setCopiedId(link.id);
    setCopyNotice(true);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const openDetail = (id: string) => {
    router.push(`/dashboard/channels/links/${id}`);
  };

  const kpiIcons = [
    <Link2 key="link" size={20} />,
    <Eye key="eye" size={20} />,
    <MessageSquare key="msg" size={20} />,
    <TrendingUp key="trend" size={20} />,
  ];
  const kpiColors = ["#2563eb", "#16a34a", "#f59e0b", "#8b5cf6"];

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="销售链接" />
        {savedNotice ? (
          <ConsoleFeedback
            variant="success"
            title="销售链接已保存"
            message="链接和二维码已生成，可以继续分发给客户或渠道。"
            onDismiss={() => setSavedNotice(false)}
          />
        ) : null}
        {copyNotice ? (
          <ConsoleFeedback
            variant="success"
            title="链接已复制"
            message="现在可以直接粘贴到微信、邮件或社媒渠道。"
            onDismiss={() => setCopyNotice(false)}
          />
        ) : null}
      </ConsolePageAlerts>

      <div className={`${styles.page}`}>
        <div className={styles.pageHeader}>
          <h1>销售链接 / 二维码</h1>
          <p>创建与管理渠道销售链接，支持多渠道发布与数据追踪</p>
        </div>

        {loading ? (
          <>
            <div className={styles.statsGrid}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </>
        ) : error ? (
          <ConsoleRequestError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className={styles.toolbarRow}>
              <span className={styles.dateRange}>
                <Calendar size={14} />
                2024-06-01 ~ 2024-06-30
              </span>
              <button type="button" className={styles.btnOutline}>
                <Download size={14} />
                导出数据
              </button>
            </div>

            <div className={styles.statsGrid}>
              {SALES_LINKS_KPIS.map((kpi, index) => (
                <div key={kpi.label} className={styles.statCard}>
                  <div className={styles.statTop}>
                    <span className={styles.statLabel}>{kpi.label}</span>
                    <span className={styles.statIcon} style={{ background: kpiColors[index] }}>
                      {kpiIcons[index]}
                    </span>
                  </div>
                  <div className={styles.statValue}>{kpi.value}</div>
                  <div className={styles.statTrend}>
                    <span className={styles.trendUp}>{kpi.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableToolbar}>
                <div className={styles.filterGroup}>
                  <select
                    className={styles.filterSelect}
                    value={channelFilter}
                    onChange={(e) => {
                      setChannelFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">全部渠道</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="zhanli">独立站</option>
                    <option value="email">邮件营销</option>
                    <option value="douyin">社交媒体</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">全部状态</option>
                    <option value="active">启用中</option>
                    <option value="inactive">已停用</option>
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={creatorFilter}
                    onChange={(e) => {
                      setCreatorFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">创建人</option>
                    {creators.map((creator) => (
                      <option key={creator} value={creator}>
                        {creator}
                      </option>
                    ))}
                  </select>
                  <div className={styles.searchInput}>
                    <Search size={14} />
                    <input
                      placeholder="链接名称"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>
                <div className={styles.actionGroup}>
                  <button type="button" className={styles.btnOutline}>
                    批量操作
                  </button>
                  <Link href="/dashboard/channels/links/new" className={styles.btnPrimary}>
                    <Plus size={14} />
                    新建链接
                  </Link>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-8">
                  <ConsoleEmptyState
                    preset="noMatches"
                    title="没有匹配的销售链接"
                    description="调整筛选条件后再试，或直接创建一条新的渠道链接。"
                    action={
                      <Link href="/dashboard/channels/links/new" className={styles.btnPrimary}>
                        新建销售链接
                      </Link>
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>
                            <input type="checkbox" aria-label="全选" />
                          </th>
                          <th>链接名称</th>
                          <th>渠道来源</th>
                          <th>创建人</th>
                          <th>短链接</th>
                          <th>二维码</th>
                          <th>访问量</th>
                          <th>留资数</th>
                          <th>转化数</th>
                          <th>转化率</th>
                          <th>状态</th>
                          <th>最近更新</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((link) => (
                          <tr key={link.id} onClick={() => openDetail(link.id)}>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" aria-label={`选择 ${link.name}`} />
                            </td>
                            <td>
                              <span className={styles.rankName}>{link.name}</span>
                            </td>
                            <td>
                              <div className={styles.channelCell}>
                                <ChannelIcon channel={link.channel} />
                                <span>{link.channelLabel}</span>
                              </div>
                            </td>
                            <td>
                              <div className={styles.creatorCell}>
                                <CreatorAvatar name={link.creator} />
                                <span>{link.creator}</span>
                              </div>
                            </td>
                            <td>
                              <div className={styles.shortLink}>
                                <span>{resolveSalesLinkPublicUrl(link).replace(/^https:\/\//, "")}</span>
                                <button
                                  type="button"
                                  className={styles.btnLink}
                                  onClick={(e) => copyLink(link, e)}
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className={styles.qrThumb}>
                                <QrCodeComp value={resolveSalesLinkPublicUrl(link)} size={30} />
                              </div>
                            </td>
                            <td>{link.visits}</td>
                            <td>{link.inquiries}</td>
                            <td>{link.conversions}</td>
                            <td>{link.conversionRate.toFixed(2)}%</td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${
                                  link.status === "active" ? styles.statusActive : styles.statusInactive
                                }`}
                              >
                                {link.status === "active" ? "启用" : "停用"}
                              </span>
                            </td>
                            <td>{link.lastUpdated}</td>
                            <td className={styles.tableActions} onClick={(e) => e.stopPropagation()}>
                              <button type="button" className={styles.btnLink} onClick={() => openDetail(link.id)}>
                                编辑
                              </button>
                              <button type="button" className={styles.btnLink} onClick={() => openDetail(link.id)}>
                                二维码
                              </button>
                              <button type="button" className={styles.btnLink} style={{ color: "#9ca3af" }}>
                                更多
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.tableFoot}>
                    <span>
                      共 {filtered.length} 条{isPreview ? "（预览数据）" : ""}
                    </span>
                    <div className={styles.pagination}>
                      <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        ‹
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            className={`${styles.pageBtn} ${page === pageNum ? styles.pageBtnActive : ""}`}
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        ›
                      </button>
                      <span style={{ marginLeft: 8 }}>{PAGE_SIZE} 条/页</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.bottomGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <h3 className={styles.panelTitle}>转化率 TOP5 链接</h3>
                </div>
                <div className={styles.rankList}>
                  {topLinks.map((link, index) => (
                    <div key={link.id} className={styles.rankItem}>
                      <span className={`${styles.rankNum} ${index < 3 ? styles.rankNumTop : ""}`}>
                        {index + 1}
                      </span>
                      <div className={styles.rankInfo}>
                        <div className={styles.rankName}>{link.name}</div>
                        <div className={styles.rankMeta}>{link.conversions} 次转化</div>
                      </div>
                      <div className={styles.rankBar}>
                        <div
                          className={styles.rankBarFill}
                          style={{ width: `${(link.conversionRate / maxRate) * 100}%` }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", minWidth: 48 }}>
                        {link.conversionRate.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <h3 className={styles.panelTitle}>最近扫码记录</h3>
                </div>
                <table className={styles.scanTable}>
                  <thead>
                    <tr>
                      <th>访客</th>
                      <th>链接名称</th>
                      <th>来源渠道</th>
                      <th>扫码时间</th>
                      <th>地区</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockScanRecords.slice(1, 6).map((record) => (
                      <tr key={record.id}>
                        <td>{record.visitorName}</td>
                        <td>{record.linkName}</td>
                        <td>{record.channel}</td>
                        <td>{record.scanTime}</td>
                        <td>{record.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <h3 className={styles.panelTitle}>快捷操作</h3>
                  <Link href="/dashboard/help" className={styles.btnLink}>
                    <HelpCircle size={14} style={{ display: "inline", verticalAlign: "middle" }} /> 帮助中心
                  </Link>
                </div>
                <div className={styles.quickList}>
                  <Link href="/dashboard/channels/links/new" className={styles.quickItem}>
                    <span className={styles.quickIcon} style={{ background: "#dbeafe", color: "#2563eb" }}>
                      <Link2 size={18} />
                    </span>
                    <span>
                      <div className={styles.quickLabel}>创建销售链接</div>
                      <div className={styles.quickDesc}>快速生成带追踪的短链接</div>
                    </span>
                  </Link>
                  <Link href="/dashboard/channels/qrcodes" className={styles.quickItem}>
                    <span className={styles.quickIcon} style={{ background: "#dcfce7", color: "#16a34a" }}>
                      <QrCode size={18} />
                    </span>
                    <span>
                      <div className={styles.quickLabel}>生成二维码</div>
                      <div className={styles.quickDesc}>下载高清二维码图片</div>
                    </span>
                  </Link>
                  <button
                    type="button"
                    className={styles.quickItem}
                    style={{ width: "100%", border: "none", background: "none", textAlign: "left" }}
                    onClick={() => {
                      const first = filtered[0];
                      if (first) copyLink(first);
                    }}
                  >
                    <span className={styles.quickIcon} style={{ background: "#ffedd5", color: "#ea580c" }}>
                      <Copy size={18} />
                    </span>
                    <span>
                      <div className={styles.quickLabel}>复制链接</div>
                      <div className={styles.quickDesc}>一键复制到剪贴板</div>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ConsolePage>
  );
}
