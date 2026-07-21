"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  Ellipsis,
  Eye,
  FileText,
  Globe,
  LogIn,
  Mail,
  MapPin,
  MoreHorizontal,
  PenLine,
  Phone,
  Plus,
  ShoppingCart,
  Star,
  Upload,
  UserPlus,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { getInquiry, listCustomerOpportunities, listQuoteOpportunities } from "@/lib/sales/api";
import type {
  CustomerOpportunityItem,
  InquiryDetail,
  QuoteListItem,
  QuoteStage,
  SourceType,
} from "@/lib/sales/types";
import { QUOTE_STAGE_LABELS } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/customer-detail.module.css";

type DetailTab =
  | "overview"
  | "contacts"
  | "followups"
  | "inquiries"
  | "quotes"
  | "orders"
  | "contracts"
  | "tasks"
  | "notes";

const SOURCE_LABELS: Record<SourceType, string> = {
  website: "官网询盘",
  sales_link: "销售链接",
  douyin: "抖音",
  expo: "展会",
  wechat: "微信",
  other: "其他",
};

const STAGES = [
  { id: 1, title: "线索获取" },
  { id: 2, title: "需求确认" },
  { id: 3, title: "方案报价" },
  { id: 4, title: "方案确认" },
  { id: 5, title: "成交提交" },
];

const EMPTY: CustomerViewModel = {
  customerName: "—",
  shortName: "—",
  customerCode: "—",
  sourceLabel: "—",
  createdAt: "—",
  tagLabel: "普通客户",
  industry: "—",
  region: "—",
  phone: "—",
  email: "—",
  website: "—",
  companySize: "—",
  address: "—",
  creditCode: "—",
  foundedAt: "—",
  revenue: "—",
  description: "暂无客户描述",
  activeStage: 1,
  stageDates: ["", "", "", "", ""],
  followUps: [],
  metrics: {
    followCount: 0,
    inquiryCount: 0,
    quoteCount: 0,
    orderAmount: 0,
    firstResponseMin: 0,
    responseRate: "—",
    satisfaction: "—",
    winProbability: "—",
  },
  quotes: [],
  statusLabel: "—",
  starCount: 0,
  levelLabel: "—",
  ownerName: "—",
  department: "—",
  nextFollowUp: "—",
  tags: [],
  profile: {
    role: "—",
    preference: "—",
    products: "—",
    budget: "—",
    purchaseCycle: "—",
    decisionCycle: "—",
    needs: "—",
  },
  tasks: [],
  tabCounts: { contacts: 0, followups: 0, inquiries: 0, quotes: 0, orders: 0, contracts: 0, tasks: 0, notes: 0 },
};

interface FollowUpItem {
  id: string;
  time: string;
  actor: string;
  body: string;
  tag: string;
  tagClass: string;
}

interface QuoteRow {
  id: string;
  code: string;
  title: string;
  quantity: number | null;
  amount: number;
  validUntil: string;
  status: QuoteStage;
  createdAt: string;
}

interface CustomerViewModel {
  customerName: string;
  shortName: string;
  customerCode: string;
  sourceLabel: string;
  createdAt: string;
  tagLabel: string;
  industry: string;
  region: string;
  phone: string;
  email: string;
  website: string;
  companySize: string;
  address: string;
  creditCode: string;
  foundedAt: string;
  revenue: string;
  description: string;
  activeStage: number;
  stageDates: string[];
  followUps: FollowUpItem[];
  metrics: {
    followCount: number;
    inquiryCount: number;
    quoteCount: number;
    orderAmount: number;
    firstResponseMin: number;
    responseRate: string;
    satisfaction: string;
    winProbability: string;
  };
  quotes: QuoteRow[];
  statusLabel: string;
  starCount: number;
  levelLabel: string;
  ownerName: string;
  department: string;
  nextFollowUp: string;
  tags: string[];
  profile: {
    role: string;
    preference: string;
    products: string;
    budget: string;
    purchaseCycle: string;
    decisionCycle: string;
    needs: string;
  };
  tasks: Array<{ id: string; title: string; time: string; priority: string; tagClass: string }>;
  tabCounts: Record<string, number>;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

function parseContact(contact: string | null): { phone: string; email: string } {
  if (!contact) return { phone: "—", email: "—" };
  const email = contact.match(/[^\s@]+@[^\s@]+/)?.[0] ?? "—";
  const phone = contact.match(/1[3-9]\d{9}|\+?\d[\d\s-]{8,}/)?.[0]?.trim() ?? contact;
  return { phone, email };
}

function quoteStatusDisplay(stage: QuoteStage): { label: string; className: string } {
  if (stage === "quoted") return { label: "已发送", className: styles.statusBlue };
  if (stage === "confirming" || stage === "won") return { label: "已确认", className: styles.statusGreen };
  if (stage === "lost") return { label: "已失效", className: styles.statusRed };
  return { label: QUOTE_STAGE_LABELS[stage] ?? stage, className: styles.statusBlue };
}

function resolveActiveStage(
  lifecycle: CustomerOpportunityItem["lifecycleColumn"] | null,
  quoteStatus: QuoteStage,
): number {
  if (lifecycle === "won_or_repeat" || quoteStatus === "won") return 5;
  if (quoteStatus === "confirming" || quoteStatus === "quoted") return 4;
  if (lifecycle === "quoting" || quoteStatus === "to_quote") return 3;
  if (lifecycle === "collecting_requirements") return 2;
  return 1;
}

function followTagFromContent(content: string): { tag: string; tagClass: string } {
  if (content.includes("电话")) return { tag: "电话沟通", tagClass: styles.tagBlue };
  if (content.includes("资料") || content.includes("发送")) return { tag: "资料发送", tagClass: styles.tagPurple };
  if (content.includes("询盘")) return { tag: "新询盘", tagClass: styles.tagGreen };
  return { tag: "跟进记录", tagClass: styles.tagGray };
}

function buildFromApi(
  inquiry: InquiryDetail,
  quotes: QuoteListItem[],
  customer: CustomerOpportunityItem | undefined,
): CustomerViewModel {
  const contact = parseContact(inquiry.customerContact);
  const activeStage = resolveActiveStage(customer?.lifecycleColumn ?? null, inquiry.quoteStatus);
  const quoteRows: QuoteRow[] = quotes.slice(0, 5).map((q) => ({
    id: q.id,
    code: `Q${q.id.slice(-8).toUpperCase()}`,
    title: q.title,
    quantity: null,
    amount: q.quotedAmount ?? q.estimatedAmount ?? q.wonAmount ?? 0,
    validUntil: q.quoteDueAt ? formatDateTime(q.quoteDueAt).slice(0, 10) : "—",
    status: q.stage,
    createdAt: formatDateTime(q.createdAt),
  }));
  const wonTotal = quotes.reduce((sum, q) => sum + (q.wonAmount ?? 0), 0);
  const followUps: FollowUpItem[] = inquiry.messages.slice(-4).reverse().map((msg) => {
    const tag = followTagFromContent(msg.content);
    return {
      id: msg.id,
      time: formatDateTime(msg.createdAt),
      actor: msg.role === "user" ? "客户" : msg.role === "assistant" ? "AI助手" : "系统",
      body: msg.content,
      tag: tag.tag,
      tagClass: tag.tagClass,
    };
  });
  if (followUps.length === 0) {
    followUps.push({
      id: "created",
      time: formatDateTime(inquiry.createdAt),
      actor: "系统",
      body: inquiry.summary ?? "客户由询盘导入系统。",
      tag: "系统创建",
      tagClass: styles.tagGray,
    });
  }

  return {
    ...EMPTY,
    customerName: inquiry.customerName,
    shortName: inquiry.customerName.split(/\s+/)[0] ?? inquiry.customerName,
    customerCode: `C${inquiry.id.slice(-8).toUpperCase()}`,
    sourceLabel: SOURCE_LABELS[inquiry.sourceType] ?? inquiry.sourceType,
    createdAt: formatDateTime(inquiry.createdAt),
    tagLabel: inquiry.intentLevel === "high" ? "重点客户" : "普通客户",
    phone: contact.phone,
    email: contact.email,
    description: inquiry.summary ?? "暂无客户描述",
    activeStage,
    stageDates: [
      formatDateTime(inquiry.createdAt).slice(0, 10),
      formatDateTime(inquiry.updatedAt).slice(0, 10),
      quoteRows[0]?.createdAt.slice(0, 10) ?? "",
      "",
      inquiry.quoteStatus === "won" ? formatDateTime(inquiry.updatedAt).slice(0, 10) : "",
    ],
    followUps,
    metrics: {
      ...EMPTY.metrics,
      followCount: Math.max(followUps.length, inquiry.messages.length),
      inquiryCount: 1,
      quoteCount: quotes.length,
      orderAmount: wonTotal || quoteRows.reduce((s, q) => s + q.amount, 0),
    },
    quotes: quoteRows,
    statusLabel: inquiry.status === "open" ? "跟进中" : "已关闭",
    starCount: inquiry.intentLevel === "high" ? 3 : inquiry.intentLevel === "medium" ? 2 : 1,
    nextFollowUp: inquiry.nextActionAt ? formatDateTime(inquiry.nextActionAt) : "—",
    profile: {
      ...EMPTY.profile,
      products: inquiry.aiInsight?.productLine ?? "—",
      needs: inquiry.summary ?? "—",
    },
    tabCounts: {
      contacts: 0,
      followups: followUps.length,
      inquiries: 1,
      quotes: quotes.length,
      orders: quotes.filter((q) => q.stage === "won").length,
      contracts: 0,
      tasks: 0,
      notes: 0,
    },
  };
}

function StageTimeline({ activeStage, stageDates }: { activeStage: number; stageDates: string[] }) {
  return (
    <div className={styles.stageTimeline}>
      {STAGES.map((stage, index) => {
        const done = stage.id < activeStage;
        const active = stage.id === activeStage;
        const pending = stage.id > activeStage;
        const isLast = index === STAGES.length - 1;
        return (
          <div key={stage.id} className={styles.stageItem}>
            {!isLast ? <div className={styles.stageLine} /> : null}
            <div className={`${styles.stageDot} ${pending ? styles.stageDotPending : ""}`} />
            <div className={styles.stageRow}>
              <div
                className={`${styles.stageBadge} ${
                  done ? styles.stageBadgeDone : active ? styles.stageBadgeActive : styles.stageBadgePending
                }`}
              >
                {done ? <Check size={12} aria-hidden /> : stage.id}
              </div>
              <div>
                <div
                  className={`${styles.stageTitle} ${active ? styles.stageTitleActive : pending ? styles.stageTitlePending : ""}`}
                >
                  {stage.id}. {stage.title}
                </div>
                <div className={`${styles.stageSub} ${active ? styles.stageSubActive : ""}`}>
                  {active ? "进行中" : stageDates[index] || (pending ? "待开始" : "")}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewContent({ data }: { data: CustomerViewModel }) {
  return (
    <div className={styles.contentGrid}>
      <div className={styles.col}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户信息</h3>
            <button type="button" className={styles.cardLink}>
              <Edit size={12} aria-hidden /> 编辑
            </button>
          </div>
          {[
            ["公司名称", data.customerName],
            ["公司简称", data.shortName],
            ["行业类型", data.industry],
            ["公司规模", data.companySize],
            ["所在地区", data.region],
            ["详细地址", data.address],
            ["统一社会信用代码", data.creditCode],
            ["公司官网", data.website],
            ["成立时间", data.foundedAt],
            ["年营业额", data.revenue],
            ["客户来源", data.sourceLabel],
          ].map(([label, value]) => (
            <div key={label} className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>{label}</span>
              <div className={value === data.website ? styles.infoStripLink : styles.fieldValue}>{value}</div>
            </div>
          ))}
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>客户描述</span>
            <div className={`${styles.fieldValue} ${styles.fieldValueMuted}`}>{data.description}</div>
          </div>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>商机阶段</h3>
          <StageTimeline activeStage={data.activeStage} stageDates={data.stageDates} />
        </div>
      </div>

      <div className={styles.col}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>跟进时间轴</h3>
            <button type="button" className={styles.cardLink}>
              查看全部 <ChevronRight size={12} aria-hidden />
            </button>
          </div>
          <div className={styles.followTimeline}>
            {data.followUps.map((item, index) => (
              <div key={item.id} className={styles.followItem}>
                {index < data.followUps.length - 1 ? <div className={styles.followLine} /> : null}
                <div className={styles.followDot} />
                <div className={styles.followHead}>
                  <span className={styles.followTime}>{item.time}</span>
                  <span className={styles.followActor}>{item.actor}</span>
                </div>
                <div className={styles.followBody}>{item.body}</div>
                <span className={`${styles.tag} ${item.tagClass}`}>{item.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>关键指标</h3>
          <div className={styles.metricGrid}>
            {[
              ["跟进次数", `${data.metrics.followCount}`, "次"],
              ["询盘次数", `${data.metrics.inquiryCount}`, "次"],
              ["报价次数", `${data.metrics.quoteCount}`, "次"],
              ["订单金额", formatCurrency(data.metrics.orderAmount), ""],
              ["首次响应时间", data.metrics.firstResponseMin > 0 ? `${data.metrics.firstResponseMin}` : "—", ""],
              ["响应及时率", data.metrics.responseRate, ""],
              ["客户满意度", data.metrics.satisfaction, ""],
              ["成交概率", data.metrics.winProbability, ""],
            ].map(([label, value, unit]) => (
              <div key={label} className={styles.metricBox}>
                <div className={styles.metricLabel}>{label}</div>
                <div className={styles.metricValue}>
                  {value}
                  {unit ? <span className={styles.metricUnit}> {unit}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>最近报价记录</h3>
            <button type="button" className={styles.cardLink}>
              查看全部
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>报价单号</th>
                  <th>报价名称</th>
                  <th>产品数量</th>
                  <th>报价金额</th>
                  <th>有效期</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.quotes.map((quote) => {
                  const status = quoteStatusDisplay(quote.status);
                  return (
                    <tr key={quote.id}>
                      <td>{quote.code}</td>
                      <td>{quote.title}</td>
                      <td>{quote.quantity == null ? "—" : `${quote.quantity}台`}</td>
                      <td>{formatCurrency(quote.amount)}</td>
                      <td>{quote.validUntil}</td>
                      <td>
                        <span className={`${styles.quoteStatus} ${status.className}`}>{status.label}</span>
                      </td>
                      <td>{quote.createdAt}</td>
                      <td>
                        <span className={styles.actionIcons}>
                          <Eye size={14} aria-hidden />
                          <Copy size={14} aria-hidden />
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {data.quotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>
                      暂无报价记录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={styles.col}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>客户状态</h3>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>跟进中</span>
            <span className={`${styles.tag} ${styles.tagGreen}`}>{data.statusLabel}</span>
          </div>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>客户级别</span>
            <div className={styles.stars} aria-label={`${data.starCount} 星`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill={i < data.starCount ? "currentColor" : "none"} aria-hidden />
              ))}
            </div>
            <div className={styles.fieldValueMuted}>{data.levelLabel}</div>
          </div>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>负责人</span>
            <div className={styles.ownerRow}>
              <div className={styles.ownerAvatar}>{data.ownerName.charAt(0)}</div>
              <span className={styles.fieldValue}>{data.ownerName}</span>
              <button type="button" className={styles.cardLink}>
                更换
              </button>
            </div>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>所属部门</span>
            <span className={styles.detailValue}>{data.department}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>下次跟进</span>
            <span className={styles.detailValue}>{data.nextFollowUp}</span>
          </div>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>客户标签</span>
            <div className={styles.tagRow}>
              {data.tags.length === 0 ? (
                <span className={styles.fieldValueMuted}>暂无标签</span>
              ) : (
                data.tags.map((tag) => (
                  <span key={tag} className={`${styles.tag} ${styles.tagBlue}`}>
                    {tag}
                  </span>
                ))
              )}
              <span className={styles.fieldValueMuted}>+</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>客户画像</h3>
            <button type="button" className={styles.cardLink}>
              <Edit size={12} aria-hidden /> 编辑
            </button>
          </div>
          {[
            ["采购角色", data.profile.role],
            ["采购偏好", data.profile.preference],
            ["关注产品", data.profile.products],
            ["预算范围", data.profile.budget],
            ["采购周期", data.profile.purchaseCycle],
            ["决策周期", data.profile.decisionCycle],
            ["客户需求", data.profile.needs],
          ].map(([label, value]) => (
            <div key={label} className={styles.detailRow}>
              <span className={styles.detailLabel}>{label}</span>
              <span className={styles.detailValue}>{value}</span>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>快捷操作</h3>
          <div className={styles.quickGrid}>
            {[
              { icon: Plus, label: "新建跟进", cls: styles.quickIconBlue },
              { icon: FileText, label: "创建报价", cls: styles.quickIconBlue },
              { icon: ShoppingCart, label: "新建订单", cls: styles.quickIconBlue },
              { icon: Upload, label: "上传文件", cls: styles.quickIconBlue },
              { icon: PenLine, label: "写备注", cls: styles.quickIconGreen },
              { icon: MoreHorizontal, label: "更多操作", cls: styles.quickIconGray },
            ].map(({ icon: Icon, label, cls }) => (
              <div key={label} className={styles.quickItem}>
                <div className={`${styles.quickIcon} ${cls}`}>
                  <Icon size={16} aria-hidden />
                </div>
                <div className={styles.quickLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>相关任务</h3>
            <button type="button" className={styles.cardLink}>
              查看全部
            </button>
          </div>
          {data.tasks.length === 0 ? (
            <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>暂无相关任务</div>
          ) : (
            data.tasks.map((task) => (
              <div key={task.id} className={styles.taskItem} style={{ marginBottom: 12 }}>
                <input type="checkbox" aria-label={task.title} />
                <div className={styles.taskBody}>
                  <div className={styles.taskTitle}>{task.title}</div>
                  <div className={styles.taskTime}>{task.time}</div>
                </div>
                <span className={`${styles.tag} ${task.tagClass}`}>{task.priority}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomerDetailWorkspace({ customerId }: { customerId: string | null }) {
  const [loading, setLoading] = useState(Boolean(customerId));
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<CustomerViewModel>(EMPTY);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const load = useCallback(async () => {
    if (!customerId) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [inquiry, allQuotes, customers] = await Promise.all([
        getInquiry(customerId),
        listQuoteOpportunities(),
        listCustomerOpportunities(),
      ]);
      const quotes = allQuotes.filter((q) => q.inquiryId === customerId);
      const customer = customers.find((c) => c.inquiryId === customerId);
      setData(buildFromApi(inquiry, quotes, customer));
    } catch (reason) {
      setError(reason);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const tabs = useMemo(
    () =>
      [
        { id: "overview" as const, label: "客户概览" },
        { id: "contacts" as const, label: "联系人", count: data.tabCounts.contacts },
        { id: "followups" as const, label: "跟进记录", count: data.tabCounts.followups },
        { id: "inquiries" as const, label: "询盘记录", count: data.tabCounts.inquiries },
        { id: "quotes" as const, label: "报价记录", count: data.tabCounts.quotes },
        { id: "orders" as const, label: "订单记录", count: data.tabCounts.orders },
        { id: "contracts" as const, label: "合同文件", count: data.tabCounts.contracts },
        { id: "tasks" as const, label: "相关任务", count: data.tabCounts.tasks },
        { id: "notes" as const, label: "备注", count: data.tabCounts.notes },
      ] as const,
    [data.tabCounts],
  );

  // 有数据(count>0)才显示对应 Tab，避免空 Tab 堆砌"即将上线"占位
  const visibleTabs = useMemo(
    () => tabs.filter((t) => t.id === "overview" || (t.count ?? 0) > 0),
    [tabs],
  );
  const activeTabResolved = visibleTabs.some((t) => t.id === activeTab)
    ? activeTab
    : "overview";

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载客户详情…</p>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分客户数据加载失败，请稍后重试。")} />
      ) : null}

      <div className={styles.headerCard}>
        <Link
          href="/dashboard/customers"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          ← 返回客户列表
        </Link>
        <div className={styles.headerTop}>
          <div>
            <div className={styles.titleRow}>
              <h1>{data.customerName}</h1>
              <span className={`${styles.tag} ${styles.tagGreen}`}>{data.tagLabel}</span>
              <Star size={16} fill="#eab308" color="#eab308" aria-hidden />
            </div>
            <div className={styles.metaRow}>
              <span>
                <LogIn size={14} aria-hidden /> 客户来源：{data.sourceLabel}
              </span>
              <span>
                <FileText size={14} aria-hidden /> 客户编码：{data.customerCode}
              </span>
              <span>
                <Clock size={14} aria-hidden /> 创建时间：{data.createdAt}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.btnOutline}>
              <Edit size={14} aria-hidden /> 编辑客户
            </button>
            <button type="button" className={styles.btnOutline}>
              <UserPlus size={14} aria-hidden /> 分配客户
            </button>
            <button type="button" className={styles.btnOutline}>
              <ArrowRightLeft size={14} aria-hidden /> 转移客户
            </button>
            <button type="button" className={styles.btnOutline}>
              <Ellipsis size={14} aria-hidden /> 更多
            </button>
          </div>
        </div>
        <div className={styles.infoStrip}>
          <div className={styles.infoStripItem}>
            <Briefcase size={14} color="#3b82f6" aria-hidden />
            <span className={styles.infoStripLabel}>行业类型</span>
            <span className={styles.infoStripValue}>{data.industry}</span>
          </div>
          <div className={styles.infoStripItem}>
            <MapPin size={14} color="#3b82f6" aria-hidden />
            <span className={styles.infoStripLabel}>所在地区</span>
            <span className={styles.infoStripValue}>{data.region}</span>
          </div>
          <div className={styles.infoStripItem}>
            <Phone size={14} color="#3b82f6" aria-hidden />
            <span className={styles.infoStripLabel}>联系电话</span>
            <span className={styles.infoStripValue}>{data.phone}</span>
          </div>
          <div className={styles.infoStripItem}>
            <Mail size={14} color="#3b82f6" aria-hidden />
            <span className={styles.infoStripLabel}>联系邮箱</span>
            <span className={styles.infoStripValue}>{data.email}</span>
          </div>
          <div className={styles.infoStripItem}>
            <Globe size={14} color="#3b82f6" aria-hidden />
            <span className={styles.infoStripLabel}>公司官网</span>
            <span className={styles.infoStripLink}>{data.website}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabBar}>
        <div className={styles.tabRow}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTabResolved === tab.id ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined ? (
                <span className={styles.tabCount}>({tab.count})</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {activeTabResolved === "overview" ? (
        <OverviewContent data={data} />
      ) : (
        <div className={styles.card} style={{ marginTop: 16 }}>
          <div className={styles.emptyTab}>
            {tabs.find((t) => t.id === activeTabResolved)?.label} 模块即将上线，当前可在「客户概览」查看核心信息。
          </div>
        </div>
      )}
    </div>
  );
}
