"use client";

import Image from "next/image";
import { useState } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Phone,
  ArrowRight,
} from "lucide-react";

import { Button } from "@qiyun/ui";

import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";

/* ── 左侧装饰：等距玻璃城市景观 ── */
function Cityscape() {
  return (
    <svg
      viewBox="0 0 420 380"
      className="w-full max-w-[420px]"
      aria-hidden
    >
      <defs>
        <linearGradient id="glassA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="glassB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id="glassC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#glow)" opacity="0.9">
        {/* 主塔 */}
        <polygon points="150,250 210,220 210,90 150,120" fill="url(#glassB)" />
        <polygon points="210,220 270,250 270,120 210,90" fill="url(#glassA)" />
        <polygon points="150,250 210,220 270,250 210,280" fill="#1e3a8a" opacity="0.55" />
        <polygon points="150,120 210,90 210,100 150,130" fill="#e0f2fe" opacity="0.7" />

        {/* 左矮楼 */}
        <polygon points="60,280 110,255 110,170 60,195" fill="url(#glassC)" />
        <polygon points="110,255 160,280 160,195 110,170" fill="url(#glassA)" />
        <polygon points="60,280 110,255 160,280 110,305" fill="#172554" opacity="0.5" />

        {/* 右塔 */}
        <polygon points="270,250 320,225 320,140 270,165" fill="url(#glassC)" />
        <polygon points="320,225 370,250 370,165 320,140" fill="url(#glassB)" />
        <polygon points="270,250 320,225 370,250 320,275" fill="#1e3a8a" opacity="0.5" />

        {/* 顶部光点 */}
        <circle cx="210" cy="90" r="4" fill="#fff" opacity="0.9" />
        <circle cx="320" cy="140" r="3" fill="#fff" opacity="0.8" />
        <circle cx="110" cy="170" r="3" fill="#fff" opacity="0.8" />
      </g>
    </svg>
  );
}

export function LoginV2Workspace() {
  const [tab, setTab] = useState<"account" | "code">("account");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-dvh w-full">
      {/* ── 左侧深色侧栏 ── */}
      <aside className="relative hidden w-[35%] max-w-[480px] shrink-0 flex-col overflow-hidden bg-[#0b1633] lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[#10204a] via-[#0b1633] to-[#060c1f]" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#2563eb]/20 blur-3xl" />
        <div className="absolute bottom-10 right-6 h-56 w-56 rounded-full bg-[#06b6d4]/15 blur-3xl" />

        <div className="relative z-10 px-10 pt-10">
          <BrandLogo size="md" layout="wordmark" tone="on-dark" showSubtitle />
        </div>

        {/* 装饰城市 */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-8">
          <Cityscape />
        </div>

        {/* 底部浮动装饰 */}
        <div className="relative z-10 px-10 pb-10">
          <div className="flex items-center gap-2 text-sm text-slate-300/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
            <span className="ml-2">智能管控 · 加速成交 · 数据驱动增长</span>
          </div>
        </div>
      </aside>

      {/* ── 右侧登录区 ── */}
      <main className="relative flex flex-1 flex-col bg-white">
        {/* 顶部电话 */}
        <div className="flex items-center justify-end px-8 py-6 text-sm text-slate-500 sm:px-12">
          <Phone className="mr-2 h-4 w-4 text-[#2563eb]" />
          <span>400-888-1234</span>
          <span className="ml-2 text-slate-400">（工作日 9:00-18:00）</span>
        </div>

        {/* 主卡片 */}
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[400px] rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(30,58,138,0.25)]">
            <div className="mb-6 flex items-center gap-2">
              <Image src={BRAND_ICON_SRC} alt={BRAND_NAME} width={40} height={40} className="object-contain" />
              <span className="text-xl font-semibold text-slate-900">{BRAND_NAME}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">智能管控 · 加速成交</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              官网报价 <span className="mx-1 text-slate-300">|</span> AI选型{" "}
              <span className="mx-1 text-slate-300">|</span> 线索管理{" "}
              <span className="mx-1 text-slate-300">|</span> 数据分析
            </p>

            {/* Tab 切换 */}
            <div className="mt-6 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setTab("account")}
                className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  tab === "account"
                    ? "border-[#2563eb] text-[#2563eb]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                账号登录
              </button>
              <button
                type="button"
                onClick={() => setTab("code")}
                className={`-mb-px ml-8 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  tab === "code"
                    ? "border-[#2563eb] text-[#2563eb]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                验证码登录
              </button>
            </div>

            {/* 表单 */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 focus-within:border-[#2563eb] focus-within:bg-white">
                <User className="h-4 w-4 text-slate-400" />
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="请输入账号或手机号"
                  className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>

              {tab === "account" ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 focus-within:border-[#2563eb] focus-within:bg-white">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="切换密码可见"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 focus-within:border-[#2563eb] focus-within:bg-white">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    placeholder="请输入短信验证码"
                    className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap text-xs font-medium text-[#2563eb]"
                  >
                    获取验证码
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  记住账号
                </label>
                <a href="#" className="text-[#2563eb] hover:underline">
                  忘记密码?
                </a>
              </div>

              <Button
                size="lg"
                className="h-12 w-full bg-[#2563eb] text-base hover:bg-[#1d4ed8]"
              >
                登录
              </Button>

              <p className="text-center text-sm text-slate-500">
                还没有账号？
                <a href="#" className="ml-1 font-medium text-[#2563eb] hover:underline">
                  立即注册
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <footer className="px-8 py-5 text-center text-xs text-slate-400 sm:px-12">
          © 2026 {BRAND_NAME} 版权所有 <span className="mx-2 text-slate-300">|</span> 浙ICP备12345678号
        </footer>
      </main>
    </div>
  );
}
