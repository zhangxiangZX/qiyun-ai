"use client";

import {
  Box,
  Bot,
  CheckCircle2,
  Cog,
  Contact,
  Hammer,
  LayoutGrid,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/brand";

import { Button } from "@qiyun/ui";
import { cn } from "@qiyun/ui";
import { apiMutate } from "@/lib/api/use-api-resource";

const NAV = [
  { label: "工作台", icon: LayoutGrid },
  { label: "创建管理", icon: Box },
  { label: "销售管理", icon: Wrench },
  { label: "客户中心", icon: Users },
  { label: "营销中心", icon: Sparkles, active: true },
  { label: "智能体", icon: Bot },
  { label: "AI 选型", icon: Zap },
  { label: "数据管理", icon: Cog },
  { label: "系统设置", icon: Hammer },
];

const PRODUCTS = [
  { name: "数控车床", model: "CK6150", price: "¥128,000起", icon: Cog, tone: "from-blue-500 to-blue-600" },
  { name: "工业机器人", model: "KR-120", price: "¥198,000起", icon: Bot, tone: "from-green-500 to-emerald-600" },
  { name: "注塑机", model: "UE3015", price: "¥266,000起", icon: Box, tone: "from-amber-500 to-orange-600" },
  { name: "加工中心", model: "VMC850", price: "¥158,000起", icon: Wrench, tone: "from-purple-500 to-violet-600" },
  { name: "激光切割机", model: "LF3015", price: "¥168,000起", icon: Zap, tone: "from-rose-500 to-red-600" },
];

function SuccessIllustration() {
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      {/* decorative diamonds/squares in brand colors */}
      <span className="absolute left-2 top-4 h-4 w-4 rotate-45 bg-blue-400/70" />
      <span className="absolute right-4 top-2 h-3 w-3 rotate-45 bg-green-400/70" />
      <span className="absolute right-2 bottom-6 h-4 w-4 rotate-45 bg-yellow-400/70" />
      <span className="absolute bottom-2 left-6 h-3 w-3 rotate-45 bg-blue-300/70" />
      <span className="absolute left-1/2 top-0 h-3 w-3 rotate-45 bg-green-300/70" />

      <svg viewBox="0 0 120 120" className="h-32 w-32 drop-shadow-sm" aria-hidden>
        <rect x="34" y="20" width="52" height="80" rx="6" fill="#ffffff" stroke="#dbe3ef" strokeWidth="2" />
        <rect x="50" y="14" width="20" height="10" rx="3" fill="#2563EB" />
        <rect x="42" y="40" width="36" height="5" rx="2.5" fill="#e2e8f0" />
        <rect x="42" y="54" width="36" height="5" rx="2.5" fill="#e2e8f0" />
        <rect x="42" y="68" width="24" height="5" rx="2.5" fill="#e2e8f0" />
        <circle cx="78" cy="82" r="20" fill="#22c55e" />
        <path
          d="M70 82 l5 5 l10 -11"
          stroke="#ffffff"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function SuccessPageWorkspace() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-card border border-border shadow-card">
      {/* Left dark sidebar */}
      <aside className="flex w-[200px] shrink-0 flex-col bg-[#0f1b35] text-slate-200">
        <div className="flex flex-col gap-1 border-b border-white/10 px-4 py-5">
          <span className="text-lg font-bold text-white">{BRAND_NAME}</span>
          <span className="text-xs text-slate-400">{BRAND_DOMAIN}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "bg-blue-500 font-medium text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col bg-background">
        <div className="flex justify-end px-6 py-4">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Contact className="h-4 w-4" />
            联系我们
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-4 text-center">
          <SuccessIllustration />

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">提交成功！</h1>
          <p className="mt-2 text-sm text-muted-foreground">感谢您的提交，我们会尽快与您联系</p>
          <p className="mt-1 text-sm text-muted-foreground">
            客服将在 <span className="font-semibold text-foreground">1</span> 个工作日内与您取得联系
          </p>
          <p className="mt-1 text-sm text-muted-foreground">您也可以直接联系我们的客服</p>

          <div className="mt-6 flex gap-3">
            <Button variant="outline">返回首页</Button>
            <Button onClick={() => apiMutate("/products", "POST")}>查看产品</Button>
          </div>
        </div>

        {/* 推荐产品 */}
        <section className="border-t border-border bg-muted/30 px-6 py-8">
          <h2 className="mb-5 text-base font-semibold">推荐产品</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {PRODUCTS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.name}
                  className="overflow-hidden rounded-card border border-border bg-card shadow-card transition-transform hover:-translate-y-1"
                >
                  <div className={cn("flex h-28 items-center justify-center bg-gradient-to-br", p.tone)}>
                    <Icon className="h-10 w-10 text-white/90" />
                  </div>
                  <div className="space-y-1 p-3 text-left">
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">型号 {p.model}</div>
                    <div className="text-sm font-medium text-primary">{p.price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
