"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  BatteryFull,
  Check,
  Headphones,
  Bot,
  Search,
  Signal,
  Trophy,
  Wifi,
  Zap,
} from "lucide-react";

import { BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";

import { Button, PageHeader } from "@qiyun/ui";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { IndustrialSelectionArt } from "@/components/bots/industrial-selection-art";
import { ConsoleFeedback } from "@/components/console/console-feedback";

const HERO_BADGES = [
  { icon: <Check size={12} />, text: "精准匹配" },
  { icon: <Check size={12} />, text: "专业推荐" },
  { icon: <Zap size={12} />, text: "高效响应" },
];

const MENU_BUTTONS = [
  { icon: <Search size={20} />, label: "智能匹配" },
  { icon: <BarChart3 size={20} />, label: "方案对比" },
  { icon: <Trophy size={20} />, label: "专业推荐" },
  { icon: <Bot size={20} />, label: "高效生产线" },
];

function MobileStatusbar() {
  return (
    <div className="flex items-center justify-between px-6 pb-1 pt-2 text-[12px] font-semibold text-slate-800">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal size={14} />
        <Wifi size={14} />
        <BatteryFull size={16} />
      </div>
    </div>
  );
}

function PhoneContent({
  role,
  onRoleChange,
  onSubmit,
}: {
  role: string;
  onRoleChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <img src={BRAND_ICON_SRC} alt="" width={24} height={24} className="object-contain" />
          <span className="text-base font-bold text-blue-600">{BRAND_NAME}</span>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-blue-600">
          <Headphones size={14} />
          联系客服
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 px-4 pb-5 pt-4">
          <h1 className="text-lg font-bold text-slate-800">智能设备选型助手</h1>
          <p className="mt-1 text-xs text-slate-500">
            告诉我们您的需求，为您推荐最合适的设备方案
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {HERO_BADGES.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-blue-600"
              >
                {b.icon}
                {b.text}
              </span>
            ))}
          </div>
          {/* 产品插画占位 */}
          <div className="mt-3 h-40 overflow-hidden rounded-lg">
            <IndustrialSelectionArt compact />
          </div>
        </div>

        {/* 为您推荐合适的设备 */}
        <div className="mt-3 px-4">
          <h2 className="text-sm font-semibold text-slate-800">为您推荐合适的设备</h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {MENU_BUTTONS.map((b) => (
              <button
                key={b.label}
                className="flex flex-col items-center gap-1 rounded-xl bg-white p-2.5 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  {b.icon}
                </span>
                <span className="text-[10px] font-medium text-slate-700">{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 请告诉我们您的需求 */}
        <div className="mt-4 px-4 pb-6">
          <h2 className="text-sm font-semibold text-slate-800">请告诉我们您的需求</h2>
          <label className="mt-2.5 block text-xs font-medium text-slate-600">
            您的角色 <span className="text-red-500">*</span>
          </label>
          <input
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            placeholder="请输入您的角色"
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
          />
          <Button className="mt-4 w-full" size="sm" onClick={onSubmit}>
            提交需求并留资
          </Button>
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 border-blue-300 text-blue-600">
              <Link href="/dashboard/bots/landing/edit">预览设置</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 border-blue-300 text-blue-600">
              <Link href="/dashboard/bots/landing">返回列表</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SelectionMobileWorkspace() {
  const [role, setRole] = useState("");
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!role.trim()) {
      setSubmitError("请先填写您的角色，再继续提交。");
      setSubmitNotice(null);
      return;
    }
    setSubmitError(null);
    setSubmitNotice("需求已记录。正式环境中将引导访客补充联系方式并生成询盘。");
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="AI选型页" />
        {submitError ? (
          <ConsoleFeedback
            variant="error"
            title="无法提交"
            message={submitError}
            onDismiss={() => setSubmitError(null)}
          />
        ) : null}
        {submitNotice ? (
          <ConsoleFeedback
            variant="success"
            title="提交流程可走通"
            message={submitNotice}
            onDismiss={() => setSubmitNotice(null)}
          />
        ) : null}

        <PageHeader
          variant="compact"
          title="AI 选型页 · 手机端预览"
          description="模拟访客在手机端填写需求与留资的完整路径。"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/bots/landing">返回选型页列表</Link>
            </Button>
          }
        />

        <div className="flex min-h-[calc(100vh-200px)] items-start justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-6">
          {/* iPhone 外壳 */}
          <div className="relative w-[300px] rounded-[2.75rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
            {/* 刘海 */}
            <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
            <div className="h-[600px] overflow-hidden rounded-[2rem] bg-white">
              <MobileStatusbar />
              <div className="h-[calc(600px-28px)]">
                <PhoneContent role={role} onRoleChange={setRole} onSubmit={handleSubmit} />
              </div>
            </div>
          </div>
        </div>
      </ConsolePageAlerts>
    </ConsolePage>
  );
}
