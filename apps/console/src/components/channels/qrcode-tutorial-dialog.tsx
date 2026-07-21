"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Link2,
  QrCode,
  Settings2,
  Share2,
} from "lucide-react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@qiyun/ui";

const STEPS = [
  {
    id: "create",
    title: "创建",
    short: "新建二维码",
    icon: QrCode,
    tone: "bg-[#3b82f6]",
    summary: "先创建一张可追踪的获客二维码，绑定业务场景。",
    points: [
      "进入「创建二维码」，填写名称与备注（如：展会机柜手册）",
      "选择类型：产品资料 / 展会入口 / 售后服务 / 销售名片等",
      "确认所属销售或渠道来源，便于后续归因统计",
    ],
    tip: "名称建议带场景 + 产品，方便列表检索与团队协作。",
  },
  {
    id: "configure",
    title: "配置",
    short: "绑定跳转与规则",
    icon: Settings2,
    tone: "bg-[#8b5cf6]",
    summary: "配置扫码后的落地页与留资规则，保证访客能进闭环。",
    points: [
      "绑定跳转目标：产品页、AI 选型页、资料下载或客服入口",
      "设置是否需要留资、是否自动分配给负责销售",
      "确认启用状态；未启用的二维码扫码不会统计访问",
    ],
    tip: "高意向场景优先绑 AI 选型页或询价表单，便于自动沉淀询盘。",
  },
  {
    id: "use",
    title: "使用",
    short: "投放与追踪",
    icon: Share2,
    tone: "bg-[#22c55e]",
    summary: "下载二维码或复制链接，投放到真实渠道并查看转化。",
    points: [
      "下载二维码图片，或复制销售链接发给客户",
      "常见投放：微信聊天、展会展架、产品手册、朋友圈/私信",
      "回到本页查看访问次数、独立访客与线索转化，跟进高意向询盘",
    ],
    tip: "话术示例：您可以扫这个码，先提交尺寸、数量和图纸，我们更快给方案。",
  },
] as const;

export interface QrcodeTutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

export function QrcodeTutorialDialog({ open, onClose }: QrcodeTutorialDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLast = stepIndex === STEPS.length - 1;
  const Icon = step.icon;

  const handleClose = () => {
    onClose();
    setStepIndex(0);
  };

  return (
    <Dialog open={open} onClose={handleClose} size="xl" aria-label="二维码使用教程" className="bg-white">
      <DialogHeader>
        <DialogTitle>二维码使用教程</DialogTitle>
        <DialogDescription>按「创建 → 配置 → 使用」三步，完成获客投放闭环。</DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-5">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((item, index) => {
            const active = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : done
                        ? "border-border bg-muted/30 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                      active || done ? item.tone : "bg-slate-300"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.short}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-3 flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${step.tone}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                第 {stepIndex + 1} 步 · {step.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.summary}</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {step.points.map((point) => (
              <li key={point} className="flex gap-2 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-xl border border-dashed border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {step.tip}
          </p>
        </section>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <Link2 className="h-3.5 w-3.5" /> 可复制销售链接
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <Download className="h-3.5 w-3.5" /> 可下载二维码图片
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <QrCode className="h-3.5 w-3.5" /> 访问与留资可追踪
          </span>
        </div>
      </DialogBody>

      <DialogFooter align="spread" className="flex-wrap gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
          稍后再看
        </Button>
        <div className="flex flex-wrap gap-2">
          {stepIndex > 0 ? (
            <Button variant="outline" size="sm" type="button" onClick={() => setStepIndex((i) => i - 1)}>
              上一步
            </Button>
          ) : null}
          {!isLast ? (
            <Button size="sm" type="button" onClick={() => setStepIndex((i) => i + 1)}>
              下一步：{STEPS[stepIndex + 1]?.title}
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/dashboard/channels/links/new?type=qrcode" onClick={handleClose}>
                去创建二维码
              </Link>
            </Button>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  );
}
