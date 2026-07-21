"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  BookOpen,
  Bot,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gift,
  Globe,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { CreateBotDialog } from "@/components/bots/create-bot-dialog";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  ASSISTANT_CHANNEL_OPTIONS_V1,
  ASSISTANT_GROUP_OPTIONS_V1,
  getAssistantListRows,
  type AssistantListRow,
} from "@/lib/bots/assistant-list-meta";
import { canPersistBots, createBot, getBotDetail, listBots, saveBot } from "@/lib/bots/data";
import { getBotsReadOnlyNotice } from "@/lib/console/mode-copy";
import type { BotDetail, BotListItem } from "@/lib/bots/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/assistant-list.module.css";

const PAGE_SIZE = 10;

const moreItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  color: "#111827",
  cursor: "pointer",
};

type LoadState = "loading" | "ready" | "error";
type StatusFilter = "all" | "enabled" | "draft" | "disabled";

function formatBotDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function statusPresentation(status: BotListItem["status"]): {
  label: string;
  className: string;
  online: boolean;
} {
  if (status === "enabled") {
    return { label: "在线", className: styles.statusOnline, online: true };
  }
  if (status === "draft") {
    return { label: "草稿", className: styles.statusDraft, online: false };
  }
  return { label: "已停用", className: styles.statusDisabled, online: false };
}

function getBotEditHref(row: AssistantListRow, apiBotIds: Set<string>): string {
  if (apiBotIds.has(row.id)) {
    return `/dashboard/bots/${row.id}/basics`;
  }
  return `/dashboard/bots/bot-support/basics`;
}

function channelClass(channelId: AssistantListRow["channels"][number]["id"]) {
  if (channelId === "douyin") return styles.channelDouyin;
  if (channelId === "xhs") return styles.channelXhs;
  if (channelId === "wechat") return styles.channelWechat;
  return styles.channelWebsite;
}

function AssistantAvatar({ row }: { row: AssistantListRow }) {
  const size = 18;
  if (row.avatarKind === "tiktok") {
    return <span style={{ fontSize: 11, fontWeight: 700 }}>抖</span>;
  }
  if (row.avatarKind === "xhs") return <BookOpen size={size} />;
  if (row.avatarKind === "wechat") return <MessageSquare size={size} />;
  if (row.avatarKind === "globe") return <Globe size={size} />;
  if (row.avatarKind === "calc") return <Calculator size={size} />;
  if (row.avatarKind === "gift") return <Gift size={size} />;
  return <Bot size={size} />;
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className={styles.selectWrap}>
      <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "全部" ? allLabel : option}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className={styles.selectIcon} />
    </div>
  );
}

export function BotsWorkspace() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [botDetails, setBotDetails] = useState<Record<string, BotDetail>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [persistenceEnabled, setPersistenceEnabled] = useState(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState("全部");
  const [groupFilter, setGroupFilter] = useState("全部");
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("1");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);

  const loadBots = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const [data, canPersist] = await Promise.all([listBots(), canPersistBots()]);
      setBots(data);
      setPersistenceEnabled(canPersist);
      setLoadState("ready");
    } catch (error) {
      setLoadError(error);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  useEffect(() => {
    setPage(1);
    setJumpPage("1");
  }, [search, statusFilter, channelFilter, groupFilter]);

  useOnWorkspaceChanged(() => {
    void loadBots();
  });

  useEffect(() => {
    if (!openMoreId) return;
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target && target.closest(`[data-more-menu="${openMoreId}"]`)) return;
      setOpenMoreId(null);
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [openMoreId]);

  useEffect(() => {
    bots.forEach((bot) => {
      if (botDetails[bot.id]) return;
      void getBotDetail(bot.id)
        .then((detail) => {
          if (detail) {
            setBotDetails((current) => ({ ...current, [detail.id]: detail }));
          }
        })
        .catch(() => undefined);
    });
  }, [botDetails, bots]);

  const descriptions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const bot of bots) {
      const detail = botDetails[bot.id];
      if (detail?.description) map[bot.id] = detail.description;
    }
    return map;
  }, [botDetails, bots]);

  const rows = useMemo(() => getAssistantListRows(bots, descriptions), [bots, descriptions]);
  const apiBotIds = useMemo(() => new Set(bots.map((bot) => bot.id)), [bots]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "enabled" && row.status !== "enabled") return false;
      if (statusFilter === "draft" && row.status !== "draft") return false;
      if (statusFilter === "disabled" && row.status !== "disabled") return false;
      if (channelFilter !== "全部" && !row.channels.some((c) => c.label === channelFilter)) return false;
      if (groupFilter !== "全部" && row.group !== groupFilter) return false;
      if (
        keyword &&
        !row.name.toLowerCase().includes(keyword) &&
        !row.description.toLowerCase().includes(keyword)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, channelFilter, groupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(
    () => ({
      total: rows.length,
      online: rows.filter((r) => r.status === "enabled").length,
      draft: rows.filter((r) => r.status === "draft").length,
      disabled: rows.filter((r) => r.status === "disabled").length,
    }),
    [rows],
  );

  const allChecked = pagedRows.length > 0 && pagedRows.every((row) => checkedIds.has(row.id));

  async function handleCreate(name: string) {
    setCreating(true);
    setErrorMessage(null);
    try {
      const draft = await createBot(name);
      setCreating(false);
      setDialogOpen(false);
      setSuccessMessage(`${t(defaultLocale, "mode.feedback.upstreamCreated")}（${name}）`);
      router.push(`/dashboard/bots/${draft.id}/basics`);
    } catch (error) {
      setCreating(false);
      setErrorMessage(getApiErrorMessage(error, "创建失败"));
    }
  }

  async function handleToggleStatus(row: AssistantListRow) {
    if (!persistenceEnabled || row.status === "draft") return;
    const bot = bots.find((item) => item.id === row.id);
    if (!bot) return;

    setTogglingId(row.id);
    setErrorMessage(null);
    try {
      const detail = botDetails[row.id] ?? (await getBotDetail(row.id));
      if (!detail) throw new Error("无法加载助手详情。");
      const nextStatus = bot.status === "enabled" ? "disabled" : "enabled";
      const saved = await saveBot({ ...detail, status: nextStatus });
      setBotDetails((current) => ({ ...current, [saved.id]: saved }));
      setBots((current) =>
        current.map((item) => (item.id === row.id ? { ...item, status: saved.status } : item)),
      );
      setSuccessMessage(nextStatus === "enabled" ? `「${row.name}」已上线。` : `「${row.name}」已停用。`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "状态更新失败。"));
    } finally {
      setTogglingId(null);
    }
  }

  function cloneBot(row: AssistantListRow) {
    const source = bots.find((item) => item.id === row.id);
    if (!source) return;
    const newId = crypto.randomUUID();
    const newName = `${source.name} 副本`;
    const clone: BotListItem = {
      ...source,
      id: newId,
      name: newName,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    setBots((current) => [clone, ...current]);
    const detail = botDetails[row.id];
    if (detail) {
      setBotDetails((current) => ({
        ...current,
        [newId]: { ...detail, id: newId, name: newName, status: "draft", updatedAt: clone.updatedAt },
      }));
    }
    setSuccessMessage(`「${source.name}」已复制为「${newName}」。`);
  }

  function deleteBot(row: AssistantListRow) {
    setBots((current) => current.filter((item) => item.id !== row.id));
    setBotDetails((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    setCheckedIds((current) => {
      const next = new Set(current);
      next.delete(row.id);
      return next;
    });
    setSuccessMessage(`「${row.name}」已删除（本会话）。`);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setChannelFilter("全部");
    setGroupFilter("全部");
  }

  function toggleRowChecked(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllChecked() {
    if (allChecked) {
      setCheckedIds((current) => {
        const next = new Set(current);
        pagedRows.forEach((row) => next.delete(row.id));
        return next;
      });
      return;
    }
    setCheckedIds((current) => {
      const next = new Set(current);
      pagedRows.forEach((row) => next.add(row.id));
      return next;
    });
  }

  function handleJumpPage() {
    const next = Number.parseInt(jumpPage, 10);
    if (Number.isNaN(next)) return;
    setPage(Math.min(totalPages, Math.max(1, next)));
  }

  if (loadState === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p>管理和配置 AI 助手，支持创建、编辑、复制和删除助手</p>
          </div>
        </div>
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={styles.kpiCard} style={{ height: 96 }} />
          ))}
        </div>
        <Skeleton className={styles.tableCard} style={{ height: 480 }} />
      </div>
    );
  }

  if (loadState === "error") {
    const { kind, message } = resolveRequestErrorPresentation(
      loadError,
      t(defaultLocale, "bots.list.error"),
    );
    return (
      <div className={styles.page}>
        <ConsoleRequestError
          kind={kind}
          message={message}
          onRetry={() => void loadBots()}
          retryLabel={t(defaultLocale, "dashboard.error.retry")}
        />
      </div>
    );
  }

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "全部状态" },
    { value: "enabled", label: "在线" },
    { value: "draft", label: "草稿" },
    { value: "disabled", label: "已停用" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p>管理和配置 AI 助手，支持创建、编辑、复制和删除助手</p>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setDialogOpen(true)}
          disabled={!persistenceEnabled}
        >
          <Plus size={16} />
          创建新助手
        </button>
      </div>

      <div className={`${styles.kpiGrid} ui-stagger-fade-in ui-hover-lift-children`}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "#3b82f6", color: "#fff" }}>
            <Bot size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>全部助手</div>
            <div className={styles.kpiValue}>{stats.total}</div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "#22c55e", color: "#fff" }}>
            <Bot size={22} />
          </div>
          <div>
            <div className={`${styles.kpiLabel} ${styles.kpiLabelOnline}`}>
              <span className={styles.onlineDot} />
              在线助手
            </div>
            <div className={styles.kpiValue}>{stats.online}</div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "#f59e0b", color: "#fff" }}>
            <FileText size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>草稿助手</div>
            <div className={styles.kpiValue}>{stats.draft}</div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "#64748b", color: "#fff" }}>
            <Ban size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>已停用</div>
            <div className={styles.kpiValue}>{stats.disabled}</div>
          </div>
        </article>
      </div>

      <div className={styles.banners}>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="机器人" />
        {!persistenceEnabled ? (
          <ConsoleReadOnlyNotice description={getBotsReadOnlyNotice("list")} />
        ) : null}
        {errorMessage ? <ConsoleRequestError message={errorMessage} /> : null}
        {successMessage ? (
          <ConsoleFeedback
            variant="success"
            title={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        ) : null}
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="搜索助手名称或描述"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>
          <FilterSelect
            value={channelFilter}
            onChange={setChannelFilter}
            options={ASSISTANT_CHANNEL_OPTIONS_V1}
            allLabel="全部渠道"
          />
          <FilterSelect
            value={groupFilter}
            onChange={setGroupFilter}
            options={ASSISTANT_GROUP_OPTIONS_V1}
            allLabel="全部分组"
          />
          <button type="button" className={styles.btnOutline} onClick={resetFilters}>
            重置
          </button>
          <div className={styles.filterSpacer} />
          <div className={styles.filterActions}>
            <button type="button" className={styles.btnOutline} disabled title="即将上线">
              批量操作
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="刷新"
              onClick={() => void loadBots()}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.tableCard} ui-stagger-fade-in ui-hover-lift-children`}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAllChecked}
                  aria-label="全选"
                />
              </th>
              <th>助手信息</th>
              <th>关联渠道</th>
              <th>分组</th>
              <th>状态</th>
              <th>更新时间</th>
              <th style={{ textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length ? (
              pagedRows.map((row) => {
                const status = statusPresentation(row.status);
                const isApiBot = bots.some((bot) => bot.id === row.id);
                return (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(row.id)}
                        onChange={() => toggleRowChecked(row.id)}
                        aria-label={`选择 ${row.name}`}
                      />
                    </td>
                    <td>
                      <div className={styles.assistantCell}>
                        <div className={styles.avatar} style={{ background: row.avatarBg }}>
                          <AssistantAvatar row={row} />
                        </div>
                        <div>
                          <div className={styles.assistantName}>{row.name}</div>
                          <div className={styles.assistantDesc}>{row.description}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.channelTags}>
                        {row.channels.map((channel) => (
                          <span
                            key={channel.id}
                            className={`${styles.channelTag} ${channelClass(channel.id)}`}
                          >
                            {channel.id === "website" ? <Globe size={12} /> : null}
                            {channel.id === "douyin" ? (
                              <span style={{ fontSize: 10, fontWeight: 700 }}>抖</span>
                            ) : null}
                            {channel.id === "xhs" ? <BookOpen size={12} /> : null}
                            {channel.id === "wechat" ? <MessageSquare size={12} /> : null}
                            {channel.label}
                          </span>
                        ))}
                        {row.extraChannelCount ? (
                          <span className={styles.channelMore}>+{row.extraChannelCount}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className={styles.groupText}>{row.group}</td>
                    <td>
                      <div className={styles.statusCell}>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={row.status === "enabled"}
                            disabled={
                              !persistenceEnabled ||
                              !isApiBot ||
                              togglingId === row.id ||
                              row.status === "draft"
                            }
                            onChange={() => void handleToggleStatus(row)}
                          />
                          <span className={styles.slider} />
                        </label>
                        <span className={status.className}>{status.label}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.updatedAt}>{formatBotDateTime(row.updatedAt)}</div>
                      <div className={styles.updatedBy}>{row.updatedBy}</div>
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        <Link
                          href={getBotEditHref(row, apiBotIds)}
                          className={styles.actionLink}
                        >
                          编辑
                        </Link>
                        <button
                          type="button"
                          className={styles.actionLink}
                          onClick={() => cloneBot(row)}
                        >
                          复制
                        </button>
                        <Link
                          href={isApiBot ? `/dashboard/conversations` : "#"}
                          className={styles.actionLink}
                          onClick={(event) => {
                            if (!isApiBot) event.preventDefault();
                          }}
                        >
                          预览
                        </Link>
                        <span
                          style={{ position: "relative", display: "inline-flex" }}
                          data-more-menu={row.id}
                        >
                          <button
                            type="button"
                            className={styles.moreBtn}
                            aria-label="更多"
                            aria-haspopup="menu"
                            aria-expanded={openMoreId === row.id}
                            onClick={() =>
                              setOpenMoreId(openMoreId === row.id ? null : row.id)
                            }
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openMoreId === row.id ? (
                            <div
                              role="menu"
                              style={{
                                position: "absolute",
                                top: "calc(100% + 4px)",
                                right: 0,
                                zIndex: 20,
                                minWidth: 112,
                                background: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                                padding: 4,
                              }}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMoreId(null);
                                  cloneBot(row);
                                }}
                                style={moreItemStyle}
                              >
                                复制
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMoreId(null);
                                  deleteBot(row);
                                }}
                                style={{ ...moreItemStyle, color: "#dc2626" }}
                              >
                                删除
                              </button>
                            </div>
                          ) : null}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyHint}>
                    {rows.length
                      ? "没有匹配的助手，试试调整筛选条件。"
                      : t(defaultLocale, "bots.list.empty.description")}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredRows.length > 0 ? (
          <div className={styles.tableFoot}>
            <div className={styles.tableFootMeta}>共 {filteredRows.length} 条</div>
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  setJumpPage(String(next));
                }}
                aria-label="上一页"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={page === num ? styles.pageBtnActive : styles.pageBtn}
                  onClick={() => {
                    setPage(num);
                    setJumpPage(String(num));
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  setJumpPage(String(next));
                }}
                aria-label="下一页"
              >
                <ChevronRight size={16} />
              </button>
              <div className={styles.selectWrap}>
                <select className={styles.select} value={PAGE_SIZE} disabled aria-label="每页条数">
                  <option>{PAGE_SIZE} 条/页</option>
                </select>
                <ChevronDown size={14} className={styles.selectIcon} />
              </div>
              <div className={styles.pageJump}>
                <span>跳至</span>
                <input
                  className={styles.pageJumpInput}
                  value={jumpPage}
                  onChange={(event) => setJumpPage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleJumpPage();
                  }}
                />
                <span>页</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <CreateBotDialog
        open={dialogOpen}
        loading={creating}
        onClose={() => setDialogOpen(false)}
        onCreate={(name) => void handleCreate(name)}
      />
    </div>
  );
}
