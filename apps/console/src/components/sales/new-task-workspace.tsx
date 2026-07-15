"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Lightbulb,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Badge, Button, Input, Label, Select } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-card border border-border bg-card p-5 shadow-card ${className ?? ""}`}>
      {children}
    </section>
  );
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground">
      {children}
      {onRemove ? (
        <button onClick={onRemove} className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-primary" aria-label="移除">
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * Calendar (June 2024 mock)
 * ------------------------------------------------------------------------- */

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
// 2024-06-01 is Saturday -> offset 6
const JUNE_FIRST_OFFSET = 6;
const JUNE_DAYS = 30;
const SELECTED_DAY = 10;

function MiniCalendar() {
  const cells: (number | null)[] = [];
  for (let i = 0; i < JUNE_FIRST_OFFSET; i++) cells.push(null);
  for (let d = 1; d <= JUNE_DAYS; d++) cells.push(d);

  return (
    <div className="rounded-card border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">2024 年 6 月</span>
        <CalendarDays size={14} className="text-muted-foreground" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className="py-1">
            {d ? (
              <button
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                  d === SELECTED_DAY
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {d}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Mock data
 * ------------------------------------------------------------------------- */

const followUpStrategies = [
  "您目前的采购计划是什么样的？是否有具体的时间表？",
  "对产品的期望度是多少？是否持特的认可或追求？",
  "目前是否已有供应商？您选择供应商时最看重哪些原因？",
  "对交货和售后服务有什么具体要求？",
  "是否需要我们把样品进一步的技术资料？",
];

const nextActions = [
  { icon: <Phone size={16} />, title: "本次通话重点", body: "确认采购时间，建立需求清单" },
  { icon: <FileText size={16} />, title: "准备资料", body: "产品资料书、认证证书、案例、报价模板" },
  { icon: <User size={16} />, title: "后续动作", body: "根据反馈制定方案与报价，安排下一次会议" },
  { icon: <Clock size={16} />, title: "建议下次联络时间", body: "3-5 个工作日后" },
];

const checklistSeed = [
  "确认客户当前采购计划时间节点",
  "确认产品技术要求与选型需求",
  "确认预算范围与决策流程",
  "介绍解决方案与竞品",
  "约定下一步跟进（样品 / 报价 / 会议）",
];

/* ----------------------------------------------------------------------------
 * Workspace
 * ------------------------------------------------------------------------- */

export function NewTaskWorkspace() {
  const [customerChip, setCustomerChip] = useState(true);
  const [inquiryChip, setInquiryChip] = useState(true);
  const [checked, setChecked] = useState<boolean[]>(() => checklistSeed.map(() => false));
  const [desc, setDesc] = useState("");

  const toggle = (i: number) => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="新建跟进任务" />
      </ConsolePageAlerts>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center gap-1 rounded-control border border-border p-2 text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">新建跟进任务</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索…" className="h-9 w-44 pl-8" />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            张
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Left ~55% */}
        <div className="w-full space-y-6 lg:w-[55%]">
          <Card>
            <CardTitle>基础信息</CardTitle>
            <div className="space-y-4">
              <Field label="相关客户" required>
                {customerChip ? (
                  <Chip onRemove={() => setCustomerChip(false)}>贝克电子有限公司 C-202406-0912</Chip>
                ) : (
                  <Select defaultValue="">
                    <option value="">选择客户…</option>
                    <option value="beike">贝克电子有限公司</option>
                  </Select>
                )}
              </Field>
              <Field label="关联询盘" required>
                {inquiryChip ? (
                  <Chip onRemove={() => setInquiryChip(false)}>
                    INQ-202406-0156 产品·智能温控器 · 渠道·独立站
                  </Chip>
                ) : (
                  <Select defaultValue="">
                    <option value="">选择询盘…</option>
                    <option value="inq">INQ-202406-0156</option>
                  </Select>
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>任务设置</CardTitle>
            <div className="space-y-4">
              <Field label="任务类型" required>
                <Select defaultValue="call">
                  <option value="call">电话跟进</option>
                  <option value="visit">上门拜访</option>
                  <option value="mail">邮件跟进</option>
                  <option value="wechat">微信跟进</option>
                </Select>
              </Field>

              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">提醒方式</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#3b5eff]" /> 系统通知
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#3b5eff]" /> 邮件提醒
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-[#3b5eff]" /> 短信提醒
                  </label>
                </div>
              </div>

              <Field label="跟进目标">
                <Select defaultValue="goal1">
                  <option value="goal1">了解需求细节、确认产品规格与报价可行性</option>
                  <option value="goal2">推进报价确认与合同签订</option>
                  <option value="goal3">处理售后问题与续约</option>
                </Select>
              </Field>

              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">跟进清单</Label>
                <ul className="space-y-2">
                  {checklistSeed.map((item, i) => (
                    <li key={i}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            checked[i] ? "border-primary bg-primary text-primary-foreground" : "border-input"
                          }`}
                        >
                          {checked[i] ? <Check size={12} /> : null}
                        </span>
                        <input type="checkbox" className="sr-only" checked={checked[i]} onChange={() => toggle(i)} />
                        <span className={checked[i] ? "text-muted-foreground line-through" : ""}>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus size={14} /> 新增清单项
                </button>
              </div>

              <Field label="任务描述">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value.slice(0, 500))}
                  className="h-24 w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="补充任务说明…"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">{desc.length} / 500</div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="优先级" required>
                  <Select defaultValue="high">
                    <option value="high">高</option>
                    <option value="mid">中</option>
                    <option value="low">低</option>
                  </Select>
                </Field>
                <Field label="负责人" required>
                  <div className="flex items-center gap-2 rounded-control border border-input bg-background px-3 py-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      张
                    </div>
                    <span className="text-sm text-foreground">张伟</span>
                  </div>
                </Field>
              </div>

              <Field label="协作者">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-xs font-semibold text-primary">
                      李
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-info/10 text-xs font-semibold text-info">
                      王
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    +2
                  </span>
                  <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus size={14} /> 添加
                  </button>
                </div>
              </Field>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost">取消</Button>
            <Button variant="outline">保存草稿</Button>
            <Button variant="default" leftIcon={<CheckCircle2 size={16} />}>
              创建任务
            </Button>
          </div>
        </div>

        {/* Right ~45% - AI 面板 */}
        <div className="w-full space-y-6 lg:w-[45%]">
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardTitle
              action={
                <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <RefreshCw size={14} /> 换一批
                </button>
              }
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> AI 跟进建议
              </span>
            </CardTitle>
            <div className="mb-3 flex items-center gap-1 text-warning">
              {"★★★★☆".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
              <span className="ml-2 text-xs font-medium text-foreground">良好</span>
            </div>
            <p className="text-xs text-muted-foreground">基于历史沟通与行为，为您生成建议</p>

            <div className="mt-4 text-xs font-medium text-muted-foreground">推荐跟进策略</div>
            <div className="mt-2 space-y-2">
              {followUpStrategies.map((s, i) => (
                <details key={i} className="group rounded-control border border-border bg-background p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground">
                    <span className="text-primary">💙</span>
                    <span className="flex-1 truncate">{s}</span>
                    <ChevronRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">建议结合客户过往问询内容，自然引出该问题以推进需求确认。</p>
                </details>
              ))}
            </div>

            <div className="mt-4 text-xs font-medium text-muted-foreground">下一步行动建议</div>
            <div className="mt-2 space-y-2">
              {nextActions.map((a, i) => (
                <details key={i} className="group rounded-control border border-border bg-background p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground">
                    {a.icon}
                    <span className="flex-1 font-medium">{a.title}</span>
                    <ChevronRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">{a.body}</p>
                </details>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Lightbulb size={16} className="text-warning" /> 相关客户历史参考
              </span>
            </CardTitle>
            <div className="flex items-start gap-2 rounded-control border border-border bg-muted/20 p-3 text-sm">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-warning" />
              <span className="text-foreground">该客户曾提交过 3 次问询，成交概率提升 32%</span>
            </div>
          </Card>

          <Card>
            <CardTitle>设定下次联络时间</CardTitle>
            <MiniCalendar />
            <div className="mt-3 flex items-center gap-2 rounded-control border border-primary/30 bg-primary/[0.03] px-3 py-2 text-sm">
              <Clock size={14} className="text-primary" />
              <span className="font-medium text-foreground">2024-06-10（周一） 10:00</span>
            </div>
            <Button variant="outline" className="mt-3 w-full border-primary/40 text-primary" leftIcon={<Clock size={16} />}>
              设定下次通话时间
            </Button>
          </Card>
        </div>
      </div>
    </ConsolePage>
  );
}
