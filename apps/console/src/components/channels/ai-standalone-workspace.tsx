"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  BookOpen,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  FileSignature,
  FileText,
  HelpCircle,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Shield,
  Star,
  User,
  UserCog,
  Wallet,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import {
  buildAiStandaloneEditHref,
  buildAiStandaloneNewHref,
  DEMO_SELECTION_PAGES,
  getPagePublicSlug,
  resolveSelectionPagePublicUrl,
  type SelectionPageIcon,
  type SelectionPageItem,
} from "@/lib/channels/ai-standalone-shared";
import { listBots } from "@/lib/bots/data";
import { listSelectionPages } from "@/lib/bots/selection-pages-api";
import type { BotListItem } from "@/lib/bots/types";
import { mapSelectionPageViewToItem } from "@/lib/channels/selection-page-mapper";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/ai-standalone.module.css";

interface FlowRule {
  id: string;
  title: string;
  sub: string;
  enabled: boolean;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}

interface ChannelLink {
  id: string;
  name: string;
  url: string;
  iconBg: string;
  icon: React.ReactNode;
}

const CHANNEL_OPTIONS = ["官网", "抖音", "小红书", "微信", "线下扫码"];

const PRODUCT_CHIPS = ["户外机柜", "不锈钢机柜", "控制柜", "机柜空调", "按图定制"];

function Toggle({
  checked,
  onChange,
  large,
  green,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  large?: boolean;
  green?: boolean;
}) {
  const sliderClass = green ? `${styles.slider} ${styles.sliderGreen}` : styles.slider;
  return (
    <label className={large ? `${styles.switch} ${styles.switchLg}` : styles.switch}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={sliderClass} />
    </label>
  );
}

function PageIcon({ type }: { type: SelectionPageIcon }) {
  if (type === "qrcode") return <QrCode size={16} color="#6b7280" />;
  if (type === "quote") return <FileSignature size={16} color="#6b7280" />;
  return <Shield size={16} color="#3b82f6" />;
}

export function AiStandaloneWorkspace() {
  const router = useRouter();
  const configRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [pages, setPages] = useState(DEMO_SELECTION_PAGES);
  const [createdPages, setCreatedPages] = useState<SelectionPageItem[]>([]);
  const [selectedId, setSelectedId] = useState("outdoor");
  const [notice, setNotice] = useState<string | null>(null);

  const [pageName, setPageName] = useState("户外机柜 AI 选型助手");
  const [pageUrl, setPageUrl] = useState("https://select.qiyun.ai/outdoor-cabinet");
  const [boundBot, setBoundBot] = useState("库滋玛 AI 产品选型助手");
  const [knowledgeBase, setKnowledgeBase] = useState("户外机柜知识库（IP65 防护 + 机柜选型）");
  const [channels, setChannels] = useState<string[]>(["官网", "抖音", "微信"]);
  const [sourceId, setSourceId] = useState("outdoor_cabinet_v1");
  const [defaultProduct, setDefaultProduct] = useState("户外机柜（IP65 防护型）");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "您好！我是库滋玛 AI 选型助手，您可以告诉我您的使用场景和需求，我为您推荐最合适的机柜方案。",
  );
  const [pageEnabled, setPageEnabled] = useState(true);
  const [activeProduct, setActiveProduct] = useState("户外机柜");

  const [rules, setRules] = useState<FlowRule[]>([
    {
      id: "inquiry",
      title: "自动创建询盘",
      sub: "用户提交后自动创建询盘记录",
      enabled: true,
      iconBg: "#dbeafe",
      iconColor: "#2563eb",
      icon: <FileText size={14} color="#2563eb" />,
    },
    {
      id: "douyin",
      title: "自动标记抖音来源",
      sub: "来自抖音渠道的询盘自动标记来源",
      enabled: true,
      iconBg: "#111827",
      iconColor: "#fff",
      icon: <span style={{ fontSize: 10, fontWeight: 700 }}>抖</span>,
    },
    {
      id: "assign",
      title: "自动分配负责人",
      sub: "按产品类型或区域自动分配负责人",
      enabled: true,
      iconBg: "#dbeafe",
      iconColor: "#2563eb",
      icon: <UserCog size={14} color="#2563eb" />,
    },
    {
      id: "intent",
      title: "高意向标记",
      sub: '勾选"强烈需要"或预算填写时标记高意向',
      enabled: true,
      iconBg: "#ffedd5",
      iconColor: "#f97316",
      icon: <Star size={14} color="#f97316" />,
    },
    {
      id: "drawing",
      title: "上传图纸创建跟进任务",
      sub: "用户上传图纸后自动创建跟进任务",
      enabled: true,
      iconBg: "#dbeafe",
      iconColor: "#2563eb",
      icon: <ClipboardList size={14} color="#2563eb" />,
    },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextBots, apiPages] = await Promise.all([
        listBots(),
        listSelectionPages().catch(() => []),
      ]);
      setBots(nextBots);
      if (nextBots[0]) {
        setBoundBot(nextBots[0].name);
      }
      if (apiPages.length > 0) {
        const mapped = apiPages.map(mapSelectionPageViewToItem);
        setPages(mapped);
        setCreatedPages([]);
        setSelectedId((current) => (mapped.some((page) => page.id === current) ? current : mapped[0]!.id));
      } else {
        setPages(DEMO_SELECTION_PAGES);
      }
    } catch (nextError) {
      setError(nextError);
      setPages(DEMO_SELECTION_PAGES);
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

  const allPages = useMemo(() => [...createdPages, ...pages], [createdPages, pages]);

  const channelLinks: ChannelLink[] = useMemo(() => {
    const selectedPage = allPages.find((p) => p.id === selectedId) ?? allPages[0];
    if (!selectedPage) return [];
    const publicUrl = resolveSelectionPagePublicUrl(getPagePublicSlug(selectedPage));
    return [
      {
        id: "douyin",
        name: "抖音主页链接",
        url: `${publicUrl}?source=douyin`,
        iconBg: "#111827",
        icon: <span style={{ fontSize: 12, fontWeight: 700 }}>抖</span>,
      },
      {
        id: "xhs",
        name: "小红书链接",
        url: `${publicUrl}?source=xhs`,
        iconBg: "#ef4444",
        icon: <BookOpen size={16} />,
      },
      {
        id: "wechat",
        name: "微信销售链接",
        url: `${publicUrl}?source=wechat`,
        iconBg: "#22c55e",
        icon: <MessageSquare size={16} />,
      },
    ];
  }, [selectedId, allPages]);

  const stats = useMemo(
    () => ({
      total: allPages.length,
      enabled: allPages.filter((p) => p.enabled).length,
      visitsToday: 128,
      submitted: 23,
      validInquiries: 16,
      quoteOps: 8,
    }),
    [allPages],
  );

  function selectPage(page: (typeof DEMO_SELECTION_PAGES)[number]) {
    setSelectedId(page.id);
    setPageName(page.name);
    setPageEnabled(page.enabled);
    setBoundBot(page.botName);
    setPageUrl(resolveSelectionPagePublicUrl(getPagePublicSlug(page)));
    setSourceId(`${page.id}_v1`);
    setChannels(page.channels.split("、").filter(Boolean));
  }

  function openEditPage(pageId: string, section: "basic" | "content" | "fields" | "robot" | "postsubmit" = "basic") {
    router.push(buildAiStandaloneEditHref(pageId, section));
  }

  function openPreview(pageId: string) {
    const page = pages.find((p) => p.id === pageId) ?? pages[0];
    if (!page) return;
    window.open(`${resolveSelectionPagePublicUrl(getPagePublicSlug(page))}?preview=1`, "_blank", "noopener,noreferrer");
  }

  function togglePageEnabled(id: string, enabled: boolean) {
    setPages((current) => current.map((p) => (p.id === id ? { ...p, enabled } : p)));
    if (selectedId === id) setPageEnabled(enabled);
  }

  function toggleChannel(channel: string) {
    setChannels((current) =>
      current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
    );
  }

  function toggleRule(id: string, enabled: boolean) {
    setRules((current) => current.map((r) => (r.id === id ? { ...r, enabled } : r)));
  }

  function copyText(text: string, message: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setNotice(message);
      window.setTimeout(() => setNotice(null), 2400);
    });
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载 AI 选型独立页…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分数据加载失败，请稍后重试。")} />
      ) : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <header className={styles.pageHeader}>
        <p>创建与管理 AI 产品选型独立页面，支持多渠道发布与数据追踪</p>
      </header>

      <div className={styles.statsGrid}>
        {[
          { label: "已创建选型页", value: stats.total, icon: <FileText size={22} color="#fff" />, bg: "#3b82f6", trend: "1 20.0%" },
          { label: "启用中", value: stats.enabled, icon: <Play size={22} color="#fff" />, bg: "#22c55e", trend: "1 25.0%" },
          { label: "今日访问", value: stats.visitsToday, icon: <Eye size={22} color="#fff" />, bg: "#8b5cf6", trend: "28 28.0%" },
          { label: "已提交需求", value: stats.submitted, icon: <MessageSquare size={22} color="#fff" />, bg: "#f59e0b", trend: "6 35.3%" },
          { label: "有效询盘", value: stats.validInquiries, icon: <User size={22} color="#fff" />, bg: "#06b6d4", trend: "4 33.3%" },
          { label: "报价机会", value: stats.quoteOps, icon: <Wallet size={22} color="#fff" />, bg: "#3b82f6", trend: "1 14.3%" },
        ].map((item) => (
          <div key={item.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: item.bg }}>
              {item.icon}
            </div>
            <div>
              <div className={styles.statLabel}>{item.label}</div>
              <div className={styles.statValue}>{item.value}</div>
              <div className={styles.statTrend}>
                较昨日{" "}
                <span className={styles.trendUp}>
                  <ArrowUp size={12} style={{ display: "inline", verticalAlign: -2 }} /> {item.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>选型页列表</h2>
              <div className={styles.sectionActions}>
                <button type="button" className={styles.btnPrimary} onClick={() => router.push(buildAiStandaloneNewHref())}>
                  <Plus size={14} /> 新建选型页
                </button>
                <button type="button" className={styles.btnOutline} onClick={() => void load()}>
                  <RefreshCw size={14} /> 刷新
                </button>
              </div>
            </div>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>页面名称</th>
                  <th>适用渠道</th>
                  <th>绑定助手</th>
                  <th>访问量</th>
                  <th>有效询盘</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {allPages.map((page) => (
                  <tr
                    key={page.id}
                    className={selectedId === page.id ? styles.rowActive : undefined}
                    onClick={() => selectPage(page)}
                  >
                    <td>
                      <div className={styles.pageNameCell}>
                        <PageIcon type={page.icon} />
                        <span className={styles.pageName}>{page.name}</span>
                        {page.isDefault ? <span className={styles.defaultTag}>默认</span> : null}
                      </div>
                    </td>
                    <td className={styles.channelText}>{page.channels}</td>
                    <td className={styles.channelText}>{page.botName}</td>
                    <td style={{ fontWeight: 500 }}>{page.visits}</td>
                    <td style={{ fontWeight: 500 }}>{page.inquiries}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className={styles.toggleRight}>
                        <Toggle
                          green
                          checked={page.enabled}
                          onChange={(v) => togglePageEnabled(page.id, v)}
                        />
                        <span>{page.enabled ? "已启用" : "已停用"}</span>
                      </div>
                    </td>
                    <td className={styles.tableActions} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className={styles.btnLink} onClick={() => openEditPage(page.id)}>
                        编辑
                      </button>
                      <button type="button" className={styles.btnLink} onClick={() => openPreview(page.id)}>
                        预览
                      </button>
                      <button type="button" className={styles.btnLink} style={{ color: "#9ca3af" }}>
                        更多 <ChevronDown size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tableFoot}>
              <span>共 {allPages.length} 条</span>
              <div className={styles.pagination}>
                <button type="button" className={styles.pageBtn} aria-label="上一页">
                  <ChevronLeft size={14} />
                </button>
                <span className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</span>
                <button type="button" className={styles.pageBtn} aria-label="下一页">
                  <ChevronRight size={14} />
                </button>
                <select className={styles.pageSize} defaultValue="10">
                  <option>10 条/页</option>
                </select>
              </div>
            </div>
          </section>

          <div className={styles.configGrid} ref={configRef}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>选型页配置</h3>
              <div className={styles.fieldStack}>
                <div className={styles.field}>
                  <label>
                    页面名称 <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrap}>
                    <input value={pageName} maxLength={50} onChange={(e) => setPageName(e.target.value)} />
                    <span className={styles.inputHint}>{pageName.length}/50</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>
                    页面地址 <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrap}>
                    <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
                    <button
                      type="button"
                      className={styles.copyIcon}
                      onClick={() => copyText(pageUrl, "页面地址已复制。")}
                      aria-label="复制地址"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>
                    绑定机器人 <span className={styles.required}>*</span>
                  </label>
                  <select value={boundBot} onChange={(e) => setBoundBot(e.target.value)}>
                    {bots.length > 0
                      ? bots.map((bot) => (
                          <option key={bot.id} value={bot.name}>
                            {bot.name}
                          </option>
                        ))
                      : <option>{boundBot}</option>}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>关联知识库</label>
                  <select value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)}>
                    <option>{knowledgeBase}</option>
                    <option>不锈钢机柜知识库</option>
                    <option>控制柜选型知识库</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>
                    适用渠道 <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.checkboxGroup}>
                    {CHANNEL_OPTIONS.map((channel) => (
                      <label key={channel} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={channels.includes(channel)}
                          onChange={() => toggleChannel(channel)}
                        />
                        {channel}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <label>来源标识</label>
                  <div className={styles.inputWrap}>
                    <input value={sourceId} onChange={(e) => setSourceId(e.target.value)} />
                    <span className={styles.inputHint} style={{ fontSize: 10 }}>
                      用于区分不同渠道来源
                    </span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>默认产品</label>
                  <select value={defaultProduct} onChange={(e) => setDefaultProduct(e.target.value)}>
                    <option>{defaultProduct}</option>
                    <option>不锈钢机柜（耐腐蚀型）</option>
                    <option>控制柜（标准型）</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>
                    欢迎语 <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrap}>
                    <textarea
                      rows={3}
                      maxLength={100}
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                    />
                    <span className={styles.textareaHint}>{welcomeMessage.length}/100</span>
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>启用状态</span>
                  <div className={styles.toggleRight}>
                    <Toggle large green checked={pageEnabled} onChange={setPageEnabled} />
                    <span>{pageEnabled ? "已启用" : "已停用"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>提交后流转规则</h3>
              <div className={styles.fieldStack}>
                {rules.map((rule) => (
                  <div key={rule.id} className={styles.ruleCard}>
                    <div className={styles.ruleLeft}>
                      <div className={styles.ruleIcon} style={{ background: rule.iconBg, color: rule.iconColor }}>
                        {rule.icon}
                      </div>
                      <div>
                        <div className={styles.ruleTitle}>{rule.title}</div>
                        <div className={styles.ruleSub}>{rule.sub}</div>
                      </div>
                    </div>
                    <div className={styles.ruleRight}>
                      <Toggle green checked={rule.enabled} onChange={(v) => toggleRule(rule.id, v)} />
                      <button type="button" className={styles.btnLink} onClick={() => openEditPage(selectedId, "postsubmit")}>
                        编辑 <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className={styles.addRuleBtn}>
                  <Plus size={14} /> 添加规则
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.channelCard}>
            <div className={styles.previewHead}>
              <div className={styles.previewTitleRow}>
                <h3 className={styles.previewTitle}>手机端预览</h3>
                <HelpCircle size={14} color="#9ca3af" />
              </div>
              <button type="button" className={styles.btnLink}>
                <RefreshCw size={12} style={{ display: "inline", marginRight: 4 }} />
                刷新预览
              </button>
            </div>
            <div className={styles.phoneShell}>
              <div className={styles.phoneBar}>
                <span>9:41</span>
                <span>●●●</span>
              </div>
              <div className={styles.phoneBody}>
                <div className={styles.phoneNav}>
                  <ChevronLeft size={12} color="#9ca3af" />
                  <div className={styles.phoneNavCenter}>
                    <div className={styles.phoneBotRow}>
                      <div className={styles.phoneBotIcon}>
                        <Bot size={10} />
                      </div>
                      <div className={styles.phoneBotTitle}>{boundBot.slice(0, 12)}</div>
                    </div>
                    <div className={styles.phoneBotSub}>智能问答 · 参数追问 · 需求提交</div>
                  </div>
                  <ExternalLink size={12} color="#9ca3af" />
                </div>

                <div className={styles.welcomeBox}>
                  <div className={styles.welcomeRow}>
                    <div className={styles.welcomeAvatar}>
                      <Bot size={14} />
                    </div>
                    <div className={styles.welcomeText}>
                      您好，我可以先回答问题，也可以帮您一步步完成选型。
                    </div>
                  </div>
                  <div className={styles.featureChips}>
                    {["专业解答", "参数追问", "自动整理"].map((f) => (
                      <span key={f} className={styles.featureChip}>
                        <CheckCircle size={10} color="#2563eb" /> {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.productChips}>
                  {PRODUCT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={activeProduct === chip ? styles.productChipActive : styles.productChip}
                      onClick={() => setActiveProduct(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className={styles.chatBlock}>
                  <div className={styles.chatRow}>
                    <div className={styles.chatAvatar}>
                      <Bot size={14} />
                    </div>
                    <div className={styles.bubbleBot}>户外机柜可以做 IP65 吗？</div>
                  </div>
                  <div className={`${styles.chatRow} ${styles.chatRowEnd}`}>
                    <div className={styles.bubbleUser}>
                      可以的，库滋玛户外机柜支持 IP55 / IP65 防护等级，采用密封结构与防水设计，适合户外环境长期使用。
                    </div>
                  </div>
                </div>

                <div className={styles.followUpBox}>
                  <div className={styles.followUpTitle}>为更精准推荐方案，请补充以下信息：</div>
                  <ol className={styles.followUpList}>
                    <li>机柜尺寸（宽×深×高 mm）是多少？</li>
                    <li>使用环境是户外还是室内？</li>
                    <li>需要的数量大概是多少？</li>
                    <li>是否有图纸或参考图片？</li>
                  </ol>
                </div>

                <button type="button" className={styles.startBtn}>
                  开始选型 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.channelCard}>
            <div className={styles.channelHead}>
              <div className={styles.previewTitleRow}>
                <h3 className={styles.previewTitle}>渠道链接生成</h3>
                <HelpCircle size={14} color="#9ca3af" />
              </div>
              <button
                type="button"
                className={styles.btnLink}
                onClick={() =>
                  copyText(channelLinks.map((c) => c.url).join("\n"), "全部渠道链接已复制。")
                }
              >
                <Copy size={12} style={{ display: "inline", marginRight: 4 }} />
                复制全部
              </button>
            </div>
            <div className={styles.channelList}>
              {channelLinks.map((link) => (
                <div key={link.id} className={styles.channelItem}>
                  <div className={styles.channelIcon} style={{ background: link.iconBg }}>
                    {link.icon}
                  </div>
                  <div className={styles.channelBody}>
                    <div className={styles.channelName}>{link.name}</div>
                    <div className={styles.channelUrlRow}>
                      <input className={styles.channelInput} value={link.url} readOnly />
                      <button
                        type="button"
                        className={styles.copyIcon}
                        style={{ position: "static" }}
                        onClick={() => copyText(link.url, "链接已复制。")}
                        aria-label="复制链接"
                      >
                        <Copy size={14} color="#9ca3af" />
                      </button>
                    </div>
                  </div>
                  <div className={styles.qrPlaceholder} aria-hidden />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}
