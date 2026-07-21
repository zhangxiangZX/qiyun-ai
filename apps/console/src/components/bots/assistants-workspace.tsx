"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import {
  BookOpen,
  Bot,
  Circle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { Alert, Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { useApiResource } from "@/lib/api/use-api-resource";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createBot } from "@/lib/bots/data";
import { CreateBotDialog } from "@/components/bots/create-bot-dialog";

import {
  ConsolePage,
  ConsolePageAlerts,
} from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";

type AssistantType = "官网Widget" | "AI选型页" | "销售链接" | "内部助手" | "知识客服";
type OnlineStatus = "在线" | "离线";

const V1_ASSISTANT_TYPES = ["官网Widget", "AI选型页", "销售链接", "内部助手"] as const satisfies readonly AssistantType[];

const PAGE_SIZE = 6;

function buildTypeTabs(assistants: Assistant[]) {
  return [
    { key: "全部" as const, label: "全部助手", count: assistants.length },
    ...V1_ASSISTANT_TYPES.map((type) => ({
      key: type,
      label: type,
      count: assistants.filter((item) => item.type === type).length })),
  ];
}

interface Assistant {
  id: string;
  name: string;
  type: AssistantType;
  scenes: string[];
  online: OnlineStatus;
  color: string;
  knowledgeBase: string;
  todaySessions: number;
  hitRate: number;
  satisfaction: number;
}

const MOCK_ASSISTANTS: Assistant[] = [
  {
    id: "a1",
    name: "官网智能客服",
    type: "官网Widget",
    scenes: ["售前咨询"],
    online: "在线",
    color: "#3b82f6",
    knowledgeBase: "产品FAQ知识库",
    todaySessions: 186,
    hitRate: 82.4,
    satisfaction: 4.6 },
  {
    id: "a2",
    name: "选型助手小Q",
    type: "AI选型页",
    scenes: ["产品选型"],
    online: "在线",
    color: "#8b5cf6",
    knowledgeBase: "选型规则知识库",
    todaySessions: 142,
    hitRate: 79.1,
    satisfaction: 4.5 },
  {
    id: "a3",
    name: "销售外呼助手",
    type: "销售链接",
    scenes: ["线索跟进"],
    online: "在线",
    color: "#22c55e",
    knowledgeBase: "话术知识库",
    todaySessions: 98,
    hitRate: 76.3,
    satisfaction: 4.4 },
  {
    id: "a4",
    name: "内部知识助手",
    type: "内部助手",
    scenes: ["内部问答"],
    online: "离线",
    color: "#f59e0b",
    knowledgeBase: "制度知识库",
    todaySessions: 0,
    hitRate: 0,
    satisfaction: 0 },
  {
    id: "a5",
    name: "售前技术支持",
    type: "官网Widget",
    scenes: ["技术支持"],
    online: "在线",
    color: "#06b6d4",
    knowledgeBase: "技术文档知识库",
    todaySessions: 88,
    hitRate: 80.7,
    satisfaction: 4.7 },
  {
    id: "a6",
    name: "展会引导助手",
    type: "官网Widget",
    scenes: ["展会活动"],
    online: "离线",
    color: "#ec4899",
    knowledgeBase: "展会资料知识库",
    todaySessions: 0,
    hitRate: 0,
    satisfaction: 0 },
  {
    id: "a7",
    name: "户外机柜选型顾问",
    type: "AI选型页",
    scenes: ["产品选型"],
    online: "在线",
    color: "#6366f1",
    knowledgeBase: "机柜产品知识库",
    todaySessions: 76,
    hitRate: 74.2,
    satisfaction: 4.3 },
  {
    id: "a8",
    name: "渠道合作助手",
    type: "销售链接",
    scenes: ["渠道合作"],
    online: "在线",
    color: "#14b8a6",
    knowledgeBase: "渠道资料知识库",
    todaySessions: 54,
    hitRate: 72.8,
    satisfaction: 4.2 },
  {
    id: "a9",
    name: "售后工单助手",
    type: "官网Widget",
    scenes: ["售后服务"],
    online: "在线",
    color: "#0ea5e9",
    knowledgeBase: "售后FAQ知识库",
    todaySessions: 62,
    hitRate: 81.1,
    satisfaction: 4.5 },
  {
    id: "a10",
    name: "报价引导助手",
    type: "销售链接",
    scenes: ["询价转化"],
    online: "在线",
    color: "#a855f7",
    knowledgeBase: "报价话术库",
    todaySessions: 41,
    hitRate: 70.5,
    satisfaction: 4.1 },
  {
    id: "a11",
    name: "工控机选型页助手",
    type: "AI选型页",
    scenes: ["产品选型"],
    online: "在线",
    color: "#f97316",
    knowledgeBase: "工控产品库",
    todaySessions: 58,
    hitRate: 62.5,
    satisfaction: 3.9 },
  {
    id: "a12",
    name: "培训答疑助手",
    type: "内部助手",
    scenes: ["员工培训"],
    online: "离线",
    color: "#64748b",
    knowledgeBase: "培训资料库",
    todaySessions: 0,
    hitRate: 0,
    satisfaction: 0 },
];

const TOP_QUESTIONS = [
  { rank: 1, question: "产品支持哪些通信协议？", sessions: 142, hitRate: 88.2 },
  { rank: 2, question: "如何申请私有化部署？", sessions: 118, hitRate: 81.5 },
  { rank: 3, question: "报价有效期是多久？", sessions: 96, hitRate: 79.0 },
  { rank: 4, question: "能否对接我们的 ERP 系统？", sessions: 84, hitRate: 74.6 },
  { rank: 5, question: "售后响应时间是多久？", sessions: 71, hitRate: 76.3 },
];

const OPTIMIZE_SUGGESTIONS = [
  { text: "AI 选型顾问命中率偏低 62.5%", count: 3, dot: "bg-red-500" },
  { text: "「选型规则知识库」缺少高压场景文档", count: 2, dot: "bg-yellow-500" },
  { text: "2 个助手会话满意度低于 4.3", count: 2, dot: "bg-yellow-500" },
];

function TrendPill({ value, tone }: { value: string; tone: "up" | "down" }) {
  return (
    <span className={`text-xs font-medium ${tone === "up" ? "text-green-600" : "text-red-600"}`}>
      {tone === "up" ? "▲" : "▼"} {value}
    </span>
  );
}

function RunOverviewChart() {
  // 命中率 vs 满意度 双折线（演示数据）
  const hit = [62, 68, 71, 70, 75, 78, 79];
  const sat = [40, 42, 41, 44, 43, 45, 45];
  const w = 280;
  const h = 120;
  const max = 100;
  const xStep = w / (hit.length - 1);
  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => `${i * xStep},${h - (v / max) * h}`)
      .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" aria-hidden>
      <polyline points={toPoints(hit)} fill="none" stroke="#3b82f6" strokeWidth="2" />
      <polyline points={toPoints(sat)} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" />
    </svg>
  );
}

export function AssistantsWorkspace() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeTab, setTypeTab] = useState<AssistantType | "全部">("全部");
  const [statusFilter, setStatusFilter] = useState<OnlineStatus | "全部">("全部");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: assistants, loading, isPreview, refetch } = useApiResource<Assistant[]>(
    "/bots",
    MOCK_ASSISTANTS
  );

  const displayAssistants = useMemo(() => {
    if (isPreview) {
      return MOCK_ASSISTANTS;
    }
    return assistants.map((item) => ({
      ...item,
      scenes: item.scenes ?? [item.type] }));
  }, [assistants, isPreview]);

  const typeTabs = useMemo(() => buildTypeTabs(displayAssistants), [displayAssistants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return displayAssistants.filter((a) => {
      const matchQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.knowledgeBase.toLowerCase().includes(q) ||
        a.scenes?.some((scene) => scene.toLowerCase().includes(q));
      const matchType = typeTab === "全部" || a.type === typeTab;
      const matchStatus = statusFilter === "全部" || a.online === statusFilter;
      return matchQuery && matchType && matchStatus;
    });
  }, [displayAssistants, query, typeTab, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, typeTab, statusFilter]);

  async function handleCreate(name: string) {
    setCreating(true);
    setCreateError(null);
    try {
      const bot = await createBot(name);
      setDialogOpen(false);
      router.push(`/dashboard/bots/${bot.id}/basics`);
    } catch (error) {
      setCreateError(getApiErrorMessage(error, "创建助手失败，请稍后重试。"));
    } finally {
      setCreating(false);
    }
  }

  const kpis = [
    { label: "助手总数", value: "12", trend: "9.1%", icon: <Bot className="h-5 w-5" />, tone: "brand" as const },
    { label: "在线中", value: "8", trend: "14.3%", icon: <Circle className="h-5 w-5 fill-current" />, tone: "success" as const },
    { label: "已绑定知识库", value: "16", trend: "6.7%", icon: <BookOpen className="h-5 w-5" />, tone: "info" as const },
    { label: "今日会话数", value: "568", trend: "18.7%", icon: <MessageSquare className="h-5 w-5" />, tone: "brand" as const },
    { label: "平均命中率", value: "78.6%", trend: "2.8pp", icon: <Target className="h-5 w-5" />, tone: "purple" as const },
  ];

  return (
    <ConsolePage>
      <PageHeader
        title="AI 助手"
        description="管理企业专属 AI 助手，配置知识与能力，持续优化客户对话体验。"
        actions={
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            新建助手
          </Button>
        }
      />

      <CreateBotDialog
        open={dialogOpen}
        loading={creating}
        onClose={() => {
          if (!creating) {
            setDialogOpen(false);
            setCreateError(null);
          }
        }}
        onCreate={(name) => void handleCreate(name)}
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="AI助手" />
        {createError ? (
          <Alert variant="warning" title="新建助手失败">
            {createError}
          </Alert>
        ) : null}

        {loading && !isPreview ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5 ui-stagger-fade-in ui-hover-lift-children">
              {kpis.map((kpi) => (
                <StatCard
                  key={kpi.label}
                  emphasis="metric"
                  label={kpi.label}
                  value={kpi.value}
                  icon={kpi.icon}
                  iconTone={kpi.tone}
                  trend={<TrendPill value={kpi.trend} tone="up" />}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap gap-1">
                {typeTabs.map((tab) => {
                  const active = typeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setTypeTab(tab.key)}
                      className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OnlineStatus | "全部")}
                  className="h-10 rounded-control border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="全部">全部状态</option>
                  <option value="在线">在线</option>
                  <option value="离线">离线</option>
                </select>
                <div className="relative min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索助手名称、场景、知识库..."
                    className="h-10 w-full rounded-control border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button variant="outline" size="sm" type="button" onClick={() => refetch()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  刷新
                </Button>
                <Button size="sm" type="button" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  新建助手
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 ui-stagger-fade-in ui-hover-lift-children">
                {paged.map((a) => (
                  <div key={a.id} className="flex flex-col rounded-card border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                        style={{ background: a.color }}
                      >
                        <Bot className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-foreground">{a.name}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={a.online === "在线" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
                          >
                            {a.online === "在线" ? "● 在线" : "● 离线"}
                          </Badge>
                          <Badge variant="secondary">{a.type}</Badge>
                          {a.scenes?.map((scene) => (
                            <Badge key={scene} variant="outline" className="text-xs">
                              {scene}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-control bg-muted/40 px-3 py-2">
                      <div className="text-xs text-muted-foreground">已绑定知识库</div>
                      <Link
                        className="text-sm font-medium text-primary hover:underline"
                        href="/dashboard/knowledge-bases"
                      >
                        {a.knowledgeBase}
                      </Link>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-base font-semibold text-foreground">{a.todaySessions}</div>
                        <div className="text-xs text-muted-foreground">今日会话</div>
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground">{a.hitRate ? `${a.hitRate}%` : "—"}</div>
                        <div className="text-xs text-muted-foreground">命中率</div>
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground">{a.satisfaction ? a.satisfaction.toFixed(1) : "—"}</div>
                        <div className="text-xs text-muted-foreground">满意度</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/bots/${a.id}/basics`}>
                          <Settings2 className="h-4 w-4" aria-hidden /> 配置
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/dashboard/conversations/test">
                          <MessageSquare className="h-4 w-4" aria-hidden /> 对话测试
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/dashboard/conversations")}
                      >
                        <Wrench className="h-4 w-4" aria-hidden /> 查看会话
                      </Button>
                    </div>
                  </div>
                ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <span>共 {filtered.length} 条</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map(
                      (pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`min-w-8 rounded-md px-2 py-1 ${
                            currentPage === pageNumber
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ),
                    )}
                    <span className="ml-2 text-xs">6 条/页</span>
                  </div>
                </div>
              </div>

              <aside className="flex flex-col gap-4 ui-stagger-fade-in">
                <div className="rounded-card border border-border bg-card p-4 shadow-card">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">助手运行概览</h3>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold text-foreground">2,986</div>
                      <div className="text-xs text-muted-foreground">总问答数</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-foreground">78.6%</div>
                      <div className="text-xs text-muted-foreground">命中率</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-foreground">4.5</div>
                      <div className="text-xs text-muted-foreground">满意度</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <RunOverviewChart />
                    <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-[#3b82f6]" /> 命中率
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded bg-[#8b5cf6]" /> 满意度
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-card border border-border bg-card p-4 shadow-card">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">热门问题 TOP5</h3>
                  <ul className="space-y-2">
                    {TOP_QUESTIONS.map((item) => (
                      <li key={item.rank} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {item.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-foreground">{item.question}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.sessions} 会话 · 命中率 {item.hitRate}%
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-card border border-border bg-card p-4 shadow-card">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">待处理优化建议</h3>
                  <ul className="space-y-2">
                    {OPTIMIZE_SUGGESTIONS.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                        <div className="flex-1 text-sm text-foreground">{item.text}</div>
                        <Badge variant="outline" className="bg-red-50 text-red-600">{item.count}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
      </ConsolePageAlerts>
    </ConsolePage>
  );
}
