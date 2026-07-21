"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  CloudUpload,
  FileText,
  History,
  Mail,
  Paperclip,
  Ruler,
  Send,
  Sparkles,
  Target,
  Users2,
  AlertTriangle,
  Factory,
  Clock3,
  UserCheck,
} from "lucide-react";

import { Badge, Button } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";

interface MissingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}

const MISSING_ITEMS: MissingItem[] = [
  { id: "m1", icon: <FileText size={15} />, title: "供应产品类型 (PDF/DWG/STEP)", hint: "请提供产品类型相关的图纸或文档" },
  { id: "m2", icon: <Ruler size={15} />, title: "尺寸", hint: "请提供关键尺寸与公差要求" },
  { id: "m3", icon: <Factory size={15} />, title: "使用环境", hint: "请说明产品的使用环境与工况" },
  { id: "m4", icon: <Clock3 size={15} />, title: "交期", hint: "请提供期望的交货时间" },
  { id: "m5", icon: <Target size={15} />, title: "预算需求", hint: "请说明预算的认证或范围要求 (如 CE, UL 等)" },
  { id: "m6", icon: <Users2 size={15} />, title: "联系方式", hint: "请确认并补充联系人及联系方式" },
];

const STATUS_OPTIONS = [
  { key: "send", label: "待发送请求", active: true },
  { key: "collect", label: "客户补齐资料", active: false },
  { key: "review", label: "浏览提交中", active: false },
  { key: "complete", label: "资料已齐全", active: false },
  { key: "done", label: "已完成", active: false },
];

const UPLOADED_FILES = [
  "产品规格书_v1.pdf",
  "现场勘测照片.jpg",
  "需求确认单.docx",
  "工艺流程说明.pdf",
  "参考案例.pptx",
  "材料清单.xlsx",
  "认证证书.jpg",
  "报价草案.pdf",
  "技术参数表.docx",
  "客户沟通记录.pdf",
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SupplementTaskWorkspace() {
  const progress = 20;
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="补充资料任务" />
      </ConsolePageAlerts>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowLeft size={13} className="cursor-pointer hover:text-foreground" />
        <span>返回任务列表</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-control border border-input hover:bg-accent"
          aria-label="返回任务列表"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-sm text-muted-foreground">返回任务列表</p>
      </div>

      <div className="flex items-start gap-3 rounded-card border border-border bg-card p-4 shadow-card">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
          <ClipboardList size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">任务需补充缺失的资料</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            请客户产品有初步兴趣，但部分关键信息缺失。请您优先下资料以便我们为您提供精准的报价方案。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
            <span>任务编号 MT-202406-0001</span>
            <span>询盘编号 INQ-20240615-032</span>
            <span>来源渠道 独立站</span>
            <span>创建时间 2024-06-15 14:23</span>
            <span>创建时间 2024-06-20 10:30</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">关联客户</h3>
                <button className="text-xs font-medium text-primary hover:underline">查看客户详情</button>
              </div>
              <div className="rounded-control border border-border p-3">
                <p className="text-base font-semibold text-foreground">ABC Industrial Co., Ltd.</p>
                <div className="mt-3 space-y-2">
                  <InfoRow label="国籍/地区" value={<span className="inline-flex items-center gap-1">🇺🇸 美国</span>} />
                  <InfoRow label="联系人" value="John Smith" />
                  <InfoRow label="邮箱" value="purchasing@abcindustrial.com" />
                  <InfoRow label="电话" value="+1 (512) 555-0198" />
                  <InfoRow label="所在地" value="CST (UTC-06:00)" />
                </div>
                <p className="mt-3 rounded-control bg-muted/30 p-2 text-xs leading-relaxed text-muted-foreground">
                  注：CST 客户关注产品性能与交期，计划 Q3 采购。
                </p>
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-foreground">沟通备注</h3>
              <textarea
                rows={5}
                placeholder="记录与客户的沟通要点，例如客户对产品性能、交期与认证的具体关注点…"
                className="w-full resize-none rounded-control border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-card border border-destructive/40 bg-card shadow-card">
              <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-3">
                <AlertTriangle size={15} className="text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">缺失资料清单 (6)</h3>
              </div>
              <ul className="divide-y divide-border">
                {MISSING_ITEMS.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-destructive/10 text-destructive">
                      {m.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.hint}</p>
                    </div>
                    <Badge variant="destructive">缺失</Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-foreground">附件上传</h3>
              <div className="flex flex-col items-center justify-center gap-2 rounded-control border border-dashed border-input bg-muted/20 py-6 text-center">
                <CloudUpload size={26} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">点击或拖拽文件到此处上传</p>
                <p className="text-xs text-muted-foreground">
                  支持 PDF、DWG、STEP、Excel、Word、图片等。单个文件不超过 50MB
                </p>
              </div>
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">已上传附件 (10)</span>
                  <span className="text-muted-foreground">暂无附件</span>
                </div>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                  {UPLOADED_FILES.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 rounded-control border border-border bg-muted/20 px-2.5 py-1.5 text-sm"
                    >
                      <Paperclip size={13} className="shrink-0 text-primary" />
                      <span className="truncate text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-foreground">任务状态</h3>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="40"
                    cy="40"
                    r={r}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold text-foreground">{progress}%</span>
                  <span className="text-[10px] text-muted-foreground">已完成</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2">
                {STATUS_OPTIONS.map((s) => (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    {s.active ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <Circle size={16} className="text-muted-foreground/40" />
                    )}
                    <span className={s.active ? "font-medium text-foreground" : "text-muted-foreground"}>
                      {s.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 space-y-2.5 border-t border-border pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">截止日期</span>
                <span className="flex items-center gap-1 font-medium text-destructive">
                  <AlertTriangle size={13} />
                  2024-06-27（7天）
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">任务优先级</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  高
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">负责人</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  李娜
                  <button className="text-xs font-normal text-primary hover:underline">更换</button>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">提醒设置</span>
                <button className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
                  发送后每 2 天提醒，最多 3 次
                  <span className="text-muted-foreground">·</span>编辑
                </button>
              </div>
              <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <History size={12} />
                查看操作记录
              </button>
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-foreground">操作</h3>
            <div className="space-y-2">
              <Button className="w-full" size="lg" leftIcon={<Send size={16} />}>
                发送补充资料请求
              </Button>
              <Button variant="outline" className="w-full" leftIcon={<CheckCircle2 size={16} />}>
                标记已完成
              </Button>
              <Button variant="outline" className="w-full" leftIcon={<UserCheck size={16} />}>
                转为跟单任务
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </ConsolePage>
  );
}
