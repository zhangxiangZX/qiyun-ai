"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Clock,
  Copy,
  Eye,
  Globe,
  HelpCircle,
  Maximize2,
  MessageCircle,
  RefreshCw,
  Settings2,
  UserPlus,
  Wand2,
} from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Label,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { useApiResource } from "@/lib/api/use-api-resource";

const MOCK_SITES = {};

const TABS = ["基础配置", "外观样式", "对话体验", "触发规则", "客服设置"] as const;
type TabKey = (typeof TABS)[number];

interface FunnelStep {
  label: string;
  value: string;
  rate: string;
  color: string;
}

const FUNNEL: FunnelStep[] = [
  { label: "页面浏览(PV)", value: "5,268", rate: "37.1%", color: "#3b5eff" },
  { label: "Widget 曝光", value: "1,958", rate: "37.1%", color: "#22c55e" },
  { label: "来触发", value: "268", rate: "13.7%", color: "#f97316" },
  { label: "提交留言", value: "42", rate: "1.7%", color: "#8b5cf6" },
  { label: "已转线索", value: "28", rate: "66.7%", color: "#06b6d4" },
];

const SITE_BINDINGS = [
  { name: "企云官网", domain: "www.qiyunai.com", status: "已安装", time: "2024-07-01 09:12", sessions: 128 },
  { name: "帮助中心", domain: "www.help.qiyunai.com", status: "已安装", time: "2024-07-01 10:05", sessions: 64 },
  { name: "营销落地页", domain: "landing.qiyunai.com", status: "已安装", time: "2024-07-02 14:30", sessions: 39 },
  { name: "博客站", domain: "blog.qiyunai.com", status: "已安装", time: "2024-07-03 11:20", sessions: 21 },
  { name: "活动页", domain: "event.qiyunai.com", status: "已安装", time: "2024-07-05 16:48", sessions: 12 },
  { name: "代理商站", domain: "partner.qiyunai.com", status: "已安装", time: "2024-07-06 08:55", sessions: 4 },
];

const EVENTS = [
  { icon: "🟢", text: "新会员注册", site: "www.qiyunai.com", time: "10:32:21" },
  { icon: "🟢", text: "查看页更", site: "www.help.qiyunai.com", time: "10:28:15" },
  { icon: "🟡", text: "留资成功", site: "help.qiyunai.com", time: "10:25:48" },
  { icon: "🟠", text: "资讯成动", site: "help.qiyunai.com", time: "10:23:03" },
  { icon: "🔵", text: "会话-机器人", site: "lq.lqyunaicom", time: "10:21:03" },
  { icon: "📭", text: "访问", site: "www.qiyunai.com", time: "10:18:42" },
];

const TREND_POINTS = [40, 55, 48, 70, 82, 75, 95, 110, 130, 122, 150, 168, 190, 210, 205, 230, 250, 268];

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const width = 120;
  const height = 32;
  const step = width / (points.length - 1);
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - ((p - min) / (max - min || 1)) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function TrendLine({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const width = 320;
  const height = 90;
  const step = width / (points.length - 1);
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - ((p - min) / (max - min || 1)) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b5eff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b5eff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${coords} ${width},${height}`} fill="url(#trendFill)" stroke="none" />
      <polyline points={coords} fill="none" stroke="#3b5eff" strokeWidth="2.5" />
    </svg>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3"
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`relative inline-block h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-border bg-card p-4 shadow-card ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const INSTALL_CODE = `<script data-key="qy_w_9f3a2c81" src="https://widget.qiyun.ai/v1/widget.js"></script>`;

export function WidgetConfigWorkspace() {
  const { data: siteConfig, loading, isPreview, refetch } = useApiResource("/sites", MOCK_SITES);
  const [activeTab, setActiveTab] = useState<TabKey>("基础配置");
  const [welcomeOn, setWelcomeOn] = useState(true);
  const [leaveMsgOn, setLeaveMsgOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const conversionSpark = useMemo(() => [8, 11, 9, 13, 15, 12, 16, 14, 18, 20, 17, 22, 19, 21, 24, 23, 26, 28, 25, 30, 28, 31, 29, 33], []);

  if (loading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="官网 Widget" />
        </ConsolePageAlerts>
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="mt-4 h-96 w-full rounded-card" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="官网 Widget" />
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        eyebrow="站点 / 官网 Widget"
        title="官网 Widget"
        description="配置和管理官网智能客服 Widget，实时预览并监控使用效果。"
        actions={
          <>
            <div className="relative">
              <Input placeholder="搜索..." className="w-56" />
            </div>
            <Button variant="outline" size="sm">
              <BookOpen size={14} /> 帮助文档
            </Button>
            <Button variant="outline" size="sm">
              <HelpCircle size={14} /> 使用指南
            </Button>
          </>
        }
      />

      {/* KPI row + mini chart */}
      <div className="mt-4 grid gap-3 md:grid-cols-5 ui-stagger-fade-in ui-hover-lift-children">
        <StatCard label="已安装站点" value="8" trend={<span className="text-success text-sm">+1</span>} icon={<Globe size={22} />} iconTone="brand" />
        <StatCard label="今日会话" value="268" trend={<span className="text-success text-sm">+18.7%</span>} icon={<MessageCircle size={22} />} iconTone="success" />
        <StatCard label="留资数" value="42" trend={<span className="text-success text-sm">+21.4%</span>} icon={<UserPlus size={22} />} iconTone="purple" />
        <StatCard label="平均首响" value="18.6秒" trend={<span className="text-warning text-sm">+3.2%</span>} icon={<Clock size={22} />} iconTone="warning" />
        <section className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">今日会话趋势</span>
            <Badge variant="success">峰值 268</Badge>
          </div>
          <TrendLine points={TREND_POINTS} />
        </section>
      </div>

      {/* Main 3-column layout */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* Left: config form */}
        <div className="lg:col-span-5">
          <Panel title="Widget 配置">
            <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-control px-3 py-1.5 text-sm transition-colors ${
                    activeTab === tab ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "基础配置" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label>Widget 名称</Label>
                  <Input defaultValue="企云图 AI 官网助手" maxLength={50} />
                  <span className="self-end text-xs text-muted-foreground">7/50</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>分配给谁</Label>
                  <Select defaultValue="官网客服助手">
                    <option>官网客服助手</option>
                    <option>智能助手</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>默认语言</Label>
                  <Select defaultValue="简体中文">
                    <option>简体中文</option>
                    <option>English</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>会话分配方式</Label>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="assign" defaultChecked /> 按轮分配
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="assign" /> 负责均摊
                    </label>
                  </div>
                </div>
                <div className="rounded-control border border-border p-3">
                  <Toggle
                    checked={leaveMsgOn}
                    onChange={setLeaveMsgOn}
                    label="落地状态：开启后端面，该受者看到留言表单"
                  />
                </div>
                <div className="rounded-control border border-border p-3">
                  <Toggle checked={welcomeOn} onChange={setWelcomeOn} label="首次进入网页自动发送欢迎语" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline">取消</Button>
                  <Button>保存配置</Button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">{activeTab} 设置即将开放</div>
            )}
          </Panel>

          <Panel title="安装代码" className="mt-4">
            <pre className="overflow-x-auto rounded-control bg-muted p-3 text-xs text-foreground">{INSTALL_CODE}</pre>
            <div className="mt-3 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setCopied(true)}>
                <Copy size={14} /> {copied ? "已复制" : "复制代码"}
              </Button>
              <span className="text-xs text-muted-foreground">最新更新：2024-08-01 10:30</span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle size={14} /> 需将此代码放到网站的 &lt;/body&gt; 标签前
            </p>
          </Panel>
        </div>

        {/* Center: preview */}
        <div className="lg:col-span-4">
          <Panel title="实时预览">
            <div className="relative flex h-80 flex-col rounded-card border border-border bg-gradient-to-br from-slate-50 to-slate-100 p-5">
              <p className="text-center text-base font-semibold text-foreground">
                让每一次客户互动都更有价值
              </p>
              <div className="mt-6 flex items-end">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-foreground shadow">
                  您好！我是企云图 AI 助手 <span className="animate-pulse">👋</span>
                  <span className="ml-1 inline-flex gap-0.5 align-middle">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <Button size="sm">免品咨询</Button>
                <Button size="sm" variant="outline">
                  预约演示
                </Button>
              </div>
              <div className="absolute right-3 top-3 flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Eye size={14} />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Maximize2 size={14} />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-3">
              <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Eye size={14} /> 打开预览
              </button>
              <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Maximize2 size={14} /> 全屏预览
              </button>
            </div>
          </Panel>
        </div>

        {/* Right: analytics */}
        <div className="space-y-4 lg:col-span-3">
          <Panel
            title="行为漏斗（今日）"
            action={
              <Select defaultValue="全部站点" className="h-8 w-28 text-xs">
                <option>全部站点</option>
              </Select>
            }
          >
            <div className="space-y-2.5">
              {FUNNEL.map((step) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{step.label}</span>
                    <span className="font-medium text-foreground">{step.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: step.rate, backgroundColor: step.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="会话转化率（今日）">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-semibold text-foreground">15.7%</span>
              <span className="text-success text-sm">+2.4pp</span>
            </div>
            <Sparkline points={conversionSpark} color="#8b5cf6" />
            <p className="mt-1 text-xs text-muted-foreground">0-24h 时段转化率</p>
          </Panel>

          <Panel title="实时事件 [最近 7 天]">
            <ul className="space-y-2.5">
              {EVENTS.map((ev, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span>{ev.icon}</span>
                  <span className="flex-1 text-foreground">{ev.text}</span>
                  <span className="text-xs text-muted-foreground">{ev.site}</span>
                  <span className="text-xs text-muted-foreground">{ev.time}</span>
                </li>
              ))}
            </ul>
            <button className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Eye size={14} /> 查看全部
            </button>
          </Panel>
        </div>
      </div>

      {/* Site bindings table */}
      <Panel title="站点与域名绑定" className="mt-4">
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {["站点名称", "域名", "状态", "安装时间", "会话数(今日)", "操作"].map((h) => (
                  <th key={h} className="h-10 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SITE_BINDINGS.map((s) => (
                <tr key={s.domain} className="border-b border-border transition-colors hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.domain}</td>
                  <td className="px-4 py-3">
                    <Badge variant="success">{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.time}</td>
                  <td className="px-4 py-3 text-foreground">{s.sessions}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-sm text-primary">
                      <button className="hover:underline">设置</button>
                      <button className="hover:underline">数据</button>
                      <button className="hover:underline">更多</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm">
          <RefreshCw size={14} /> 刷新数据
        </Button>
        <Button size="sm">
          <Wand2 size={14} /> 智能优化
        </Button>
      </div>
    </ConsolePage>
  );
}
