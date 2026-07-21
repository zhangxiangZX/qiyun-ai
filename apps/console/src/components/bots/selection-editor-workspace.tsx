"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Code,
  Compass,
  Eye,
  File as FileIcon,
  Grid,
  Image as ImageIcon,
  Lock,
  Save,
  Search,
  Send,
  Shield,
  Target,
  Type as TIcon,
  User,
  Users,
  Zap,
} from "lucide-react";

import { Badge, Button, PageHeader } from "@qiyun/ui";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { IndustrialSelectionArt } from "@/components/bots/industrial-selection-art";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { SelectionSubmissionsWorkspace } from "@/components/bots/selection-submissions-workspace";

/* ── 配置项分组定义 ── */
interface ConfigItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const BASIC_ITEMS: ConfigItem[] = [
  { key: "title", label: "标题", icon: <TIcon size={16} /> },
  { key: "banner", label: "轮播图", icon: <ImageIcon size={16} /> },
  { key: "guide", label: "功能引导", icon: <Grid size={16} /> },
  { key: "cases", label: "客户案例", icon: <User size={16} /> },
  { key: "advantage", label: "服务优势", icon: <Check size={16} /> },
  { key: "nav", label: "底部导航", icon: <Compass size={16} /> },
];

const ADVANCED_ITEMS: ConfigItem[] = [
  { key: "seo", label: "SEO 设置", icon: <Search size={16} /> },
  { key: "permission", label: "页面权限", icon: <Lock size={16} /> },
  { key: "code", label: "自定义代码", icon: <Code size={16} /> },
  { key: "page", label: "页面设置", icon: <FileIcon size={16} /> },
];

const DISPLAY_TOGGLES = [
  { key: "pageNav", label: "页面导航" },
  { key: "bottomNav", label: "底部导航" },
  { key: "share", label: "分享按钮" },
];

const DEVICE_TAGS = ["数控机床", "工业机器人", "激光设备", "自动化产线", "检测设备", "辅助设备"];
const FEATURE_BADGES = [
  { icon: "●", text: "精准匹配" },
  { icon: "⭐", text: "专业推荐" },
  { icon: "✅", text: "免费使用" },
  { icon: "⚡", text: "高效便捷" },
];
const ADVANTAGES = [
  { icon: <Target size={18} />, label: "精准匹配" },
  { icon: <Users size={18} />, label: "专业团队" },
  { icon: <Zap size={18} />, label: "高效响应" },
  { icon: <Shield size={18} />, label: "售后保障" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ConfigRow({ item, onClick }: { item: ConfigItem; onClick: (k: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.key)}
      className="flex w-full items-center justify-between rounded-control border border-transparent px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-border hover:bg-accent/40"
    >
      <span className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
          {item.icon}
        </span>
        {item.label}
      </span>
      <ChevronRight size={15} className="text-muted-foreground" />
    </button>
  );
}

function PreviewPanel() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold text-foreground">预览效果</span>
        <Badge variant="info">实时</Badge>
      </div>
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-4">
        {/* Hero */}
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
          {/* 产品插画占位 */}
          <div className="mt-4 h-72 overflow-hidden rounded-lg">
            <IndustrialSelectionArt />
          </div>
        </div>

        {/* 为您推荐合适的设备 */}
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

        {/* 我们的优势 */}
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

export function SelectionEditorWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get("id");
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"config" | "form" | "option" | "submissions">(
    initialTab === "submissions" ? "submissions" : "config",
  );
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [previewNotice, setPreviewNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pageNav: true,
    bottomNav: true,
    share: true,
  });

  const handleSave = (publish = false) => {
    setSaving(true);
    setErrorMessage(null);
    window.setTimeout(() => {
      setSaving(false);
      setSavedNotice(true);
      if (publish) {
        window.sessionStorage.setItem("ai-landing-saved", "1");
        router.push("/dashboard/bots/landing");
      }
    }, 500);
  };

  const tabs = [
    { key: "config" as const, label: "页面配置" },
    { key: "form" as const, label: "表单设置" },
    { key: "option" as const, label: "选项设置" },
    { key: "submissions" as const, label: "提交记录" },
  ];

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="AI 选型页" />
        {errorMessage ? (
          <ConsoleFeedback variant="error" title="保存失败" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        ) : null}
        {savedNotice ? (
          <ConsoleFeedback
            variant="success"
            title="保存成功"
            message="页面配置已更新。"
            onDismiss={() => setSavedNotice(false)}
          />
        ) : null}
        {previewNotice ? (
          <ConsoleFeedback
            variant="info"
            title="预览模式"
            message="右侧为当前配置的实时预览。对外访问地址将在发布后生成。"
            onDismiss={() => setPreviewNotice(false)}
          />
        ) : null}

        <PageHeader
          title="编辑 AI 选型页"
          description={
            pageId
              ? `正在编辑页面 ${pageId}，可调整内容、留资表单与发布状态。`
              : "调整页面内容、留资表单与发布状态。"
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Eye size={15} />}
                onClick={() => setPreviewNotice(true)}
              >
                预览
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Save size={15} />}
                disabled={saving}
                onClick={() => handleSave(false)}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
              <Button size="sm" leftIcon={<Send size={15} />} disabled={saving} onClick={() => handleSave(true)}>
                发布
              </Button>
            </div>
          }
        />

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href="/dashboard/bots/landing" aria-label="返回 AI 选型页列表">
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <div className="flex items-center gap-1 rounded-control border border-border bg-card p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`h-8 rounded-[7px] px-4 text-xs font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "submissions" ? (
          pageId ? (
            <SelectionSubmissionsWorkspace pageId={pageId} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              请先在「页面配置」中保存选型页，保存后即可查看访客提交记录。
            </div>
          )
        ) : (
          <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
            {/* 左侧配置面板 */}
            <div className="space-y-3">
              <section className="rounded-card border border-border bg-card p-3 shadow-card">
                <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  基础设置
                </h3>
                <div className="space-y-0.5">
                  {BASIC_ITEMS.map((item) => (
                    <ConfigRow
                      key={item.key}
                      item={item}
                      onClick={() => setActiveTab("config")}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-card border border-border bg-card p-3 shadow-card">
                <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  显示设置
                </h3>
                <div className="space-y-0.5">
                  {DISPLAY_TOGGLES.map((t) => (
                    <div
                      key={t.key}
                      className="flex items-center justify-between rounded-control px-3 py-2 text-sm text-foreground"
                    >
                      <span>{t.label}</span>
                      <Toggle
                        on={toggles[t.key]}
                        onChange={(v) => setToggles((s) => ({ ...s, [t.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-card border border-border bg-card p-3 shadow-card">
                <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  高级设置
                </h3>
                <div className="space-y-0.5">
                  {ADVANCED_ITEMS.map((item) => (
                    <ConfigRow
                      key={item.key}
                      item={item}
                      onClick={() => setActiveTab("config")}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* 右侧预览效果 */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <PreviewPanel />
            </div>
          </div>
        )}
      </ConsolePageAlerts>
    </ConsolePage>
  );
}
