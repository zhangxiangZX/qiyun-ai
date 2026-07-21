"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";

import { Badge, Button, PageHeader } from "@qiyun/ui";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { IndustrialSelectionArt } from "@/components/bots/industrial-selection-art";
import { ConsoleFeedback } from "@/components/console/console-feedback";

const STEPS = [
  { key: "basic", label: "基本信息" },
  { key: "config", label: "页面配置" },
  { key: "generate", label: "生成设置" },
  { key: "publish", label: "发布设置" },
];

const DEVICE_TAGS = ["数控机床", "工业机器人", "激光设备", "自动化产线", "检测设备", "辅助设备"];
const FEATURE_BADGES = [
  { icon: "●", text: "精准匹配" },
  { icon: "⭐", text: "专业推荐" },
  { icon: "✅", text: "免费使用" },
  { icon: "⚡", text: "高效便捷" },
];
const EMPOWER_TAGS = ["数据驱动", "AI 推荐", "实时匹配", "方案对比", "专家支持"];
const ADVANTAGES = [
  { icon: <Target size={18} />, label: "精准匹配" },
  { icon: <Users size={18} />, label: "专业团队" },
  { icon: <Zap size={18} />, label: "高效响应" },
  { icon: <Shield size={18} />, label: "售后保障" },
];

const TEMPLATES = [
  { key: "featured", name: "精选版", tag: "推荐", gradient: "from-sky-100 to-blue-200", ring: "bg-blue-100" },
  { key: "tech", name: "科技感", tag: "", gradient: "from-slate-700 to-blue-900", ring: "bg-slate-700" },
  { key: "industrial", name: "工业风", tag: "", gradient: "from-stone-300 to-gray-500", ring: "bg-stone-400" },
  { key: "dark", name: "深色风", tag: "", gradient: "from-zinc-800 to-black", ring: "bg-zinc-800" },
];

function StepIndicator({ active }: { active: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const isActive = i === active;
        const done = i < active;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check size={15} /> : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div className="mx-2 h-0.5 flex-1 rounded bg-border">
                <div
                  className={`h-full rounded bg-primary transition-all ${
                    done ? "w-full" : "w-0"
                  }`}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PreviewPanel() {
  return (
    <div className="sticky top-4 overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold text-foreground">实时预览</span>
        <Badge variant="info">编辑器</Badge>
      </div>
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-4">
        <div className="rounded-xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-5">
          <h3 className="text-xl font-bold text-slate-800">智能设备选型助手</h3>
          <p className="mt-1.5 text-sm text-slate-500">
            告诉我们您的需求，AI 为您推荐最合适的设备方案
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FEATURE_BADGES.map((b) => (
              <span
                key={b.text}
                className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-blue-600 shadow-sm"
              >
                <span className="text-blue-500">{b.icon}</span>
                {b.text}
              </span>
            ))}
          </div>
          <div className="mt-4 h-52 overflow-hidden rounded-lg">
            <IndustrialSelectionArt />
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-foreground">为您推荐合适的设备</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEVICE_TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-foreground">为您的智能选型赋能</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMPOWER_TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-foreground">我们的优势</h4>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {ADVANTAGES.map((a) => (
              <div
                key={a.label}
                className="flex flex-col items-center gap-1.5 rounded-control border border-border bg-muted/20 px-2 py-3 text-center"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {a.icon}
                </span>
                <span className="text-[11px] font-medium text-foreground">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SelectionWizardWorkspace() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [product, setProduct] = useState("");
  const [pageType, setPageType] = useState("standard");
  const [style, setStyle] = useState("tech-blue");
  const [scenes, setScenes] = useState<string[]>(["general"]);
  const [template, setTemplate] = useState("featured");

  const toggleScene = (s: string) =>
    setScenes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="AI 选型页" />

        {errorMessage ? (
          <ConsoleFeedback variant="error" title="保存失败" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        ) : null}

        <PageHeader
          variant="compact"
          title="新建 AI 选型页"
          description="配置页面名称、绑定助手、产品范围与留资表单，完成后发布对外访问。"
          actions={
            <Button variant="outline" size="sm" leftIcon={<Eye size={15} />}>
              预览
            </Button>
          }
        />

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href="/dashboard/bots/landing" aria-label="返回 AI 选型页列表">
              <ArrowLeft size={16} />
            </Link>
          </Button>
        </div>

        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <StepIndicator active={0} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 左侧表单 */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 text-base font-semibold text-foreground">基本信息</h3>
            <div className="space-y-4">
              {/* 页面名称 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  页面名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 30))}
                  placeholder="请输入页面名称"
                  className="h-10 w-full rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{name.length}/30</p>
              </div>

              {/* 页面地址 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  页面地址 <span className="text-red-500">*</span>
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value.slice(0, 30))}
                  placeholder="https://sek.ai/selection/xxxxx"
                  className="h-10 w-full rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  自定义后缀 {address.length}/30
                </p>
              </div>

              {/* 选择行业 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  选择行业 <span className="text-red-500">*</span>
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-10 w-full rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">请选择行业</option>
                  <option>机械制造</option>
                  <option>电子电气</option>
                  <option>新能源</option>
                  <option>汽车工业</option>
                </select>
              </div>

              {/* 选择产品 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  选择产品 <span className="text-red-500">*</span>
                </label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="h-10 w-full rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">请选择产品</option>
                  <option>数控机床</option>
                  <option>工业机器人</option>
                  <option>激光设备</option>
                  <option>自动化产线</option>
                </select>
              </div>

              {/* 页面类型 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  页面类型 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "standard", label: "标准页", hint: "推荐" },
                    { v: "advanced", label: "高级页", hint: "" },
                    { v: "solution", label: "解决方案页", hint: "" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setPageType(o.v)}
                      className={`flex items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors ${
                        pageType === o.v
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          pageType === o.v ? "border-primary" : "border-muted-foreground"
                        }`}
                      >
                        {pageType === o.v ? (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      {o.label}
                      {o.hint ? (
                        <span className="rounded bg-primary/10 px-1 text-[10px] text-primary">
                          {o.hint}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {/* 应用场景 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  应用场景 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "general", label: "通用场景" },
                    { v: "industry", label: "行业场景" },
                    { v: "custom", label: "定制场景" },
                  ].map((o) => {
                    const checked = scenes.includes(o.v);
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => toggleScene(o.v)}
                        className={`flex items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-input text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            checked ? "border-primary bg-primary text-white" : "border-muted-foreground"
                          }`}
                        >
                          {checked ? <Check size={12} /> : null}
                        </span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 页面风格 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  页面风格 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "tech-blue", label: "科技蓝" },
                    { v: "minimal", label: "极简白" },
                    { v: "biz-blue", label: "商务深蓝" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setStyle(o.v)}
                      className={`flex items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors ${
                        style === o.v
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          style === o.v ? "border-primary" : "border-muted-foreground"
                        }`}
                      >
                        {style === o.v ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                      </span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 页面模板 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">页面模板</label>
                <div className="grid grid-cols-4 gap-2">
                  {TEMPLATES.map((t) => {
                    const active = template === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTemplate(t.key)}
                        className={`relative overflow-hidden rounded-control border p-2 text-left transition-colors ${
                          active ? "border-primary ring-2 ring-primary/30" : "border-input hover:border-primary/40"
                        }`}
                      >
                        {active ? (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                            <Check size={11} />
                          </span>
                        ) : null}
                        <div className={`mb-1.5 h-14 rounded bg-gradient-to-br ${t.gradient}`} />
                        <p className="text-[11px] font-medium text-foreground">{t.name}</p>
                        {t.tag ? (
                          <p className="text-[10px] text-primary">{t.tag}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">&nbsp;</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/bots/landing">取消</Link>
              </Button>
              <Button
                size="sm"
                rightIcon={<ChevronRight size={15} />}
                disabled={saving}
                onClick={() => {
                  if (!name.trim()) {
                    setErrorMessage("请填写页面名称。");
                    return;
                  }
                  setSaving(true);
                  window.setTimeout(() => {
                    window.sessionStorage.setItem("ai-landing-saved", "1");
                    router.push("/dashboard/bots/landing");
                  }, 500);
                }}
              >
                {saving ? "保存中..." : "保存并返回列表"}
              </Button>
            </div>
          </div>

          {/* 右侧预览 */}
          <PreviewPanel />
        </div>
      </ConsolePageAlerts>
    </ConsolePage>
  );
}
