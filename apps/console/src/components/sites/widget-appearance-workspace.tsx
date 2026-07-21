"use client";

import { useCallback, useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";

import { Button, Label, PageHeader, Select } from "@qiyun/ui";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { cn } from "@qiyun/ui";
import { useApiResource, apiMutate, isPreviewModeError } from "@/lib/api/use-api-resource";

/* ---------- shared local primitives ---------- */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-block h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-foreground hover:bg-accent/40",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border",
                active ? "border-primary" : "border-muted-foreground",
              )}
            >
              {active ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </span>
            <input
              type="radio"
              className="sr-only"
              checked={active}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

function Checkbox({
  checked,
  label,
  dot,
}: {
  checked: boolean;
  label: string;
  dot?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          checked ? "border-primary bg-primary text-white" : "border-muted-foreground",
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
      {dot ? <span className={cn("h-2 w-2 rounded-full", dot)} /> : null}
      {label}
    </label>
  );
}

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((it, i) => (
        <span key={it} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-border">/</span> : null}
          <span className={i === items.length - 1 ? "font-medium text-foreground" : ""}>
            {it}
          </span>
        </span>
      ))}
    </nav>
  );
}

const TABS = ["外观设置", "行为设置", "欢迎语设置", "高级设置"];

const MOCK_APPEARANCE = {};

/* ---------- page ---------- */

export function WidgetAppearanceWorkspace() {
  const [activeTab, setActiveTab] = useState("外观设置");
  const [themeColor, setThemeColor] = useState("#2563EB");
  const [buttonShape, setButtonShape] = useState<"circle" | "square">("circle");
  const [iconPosition, setIconPosition] = useState<"left" | "right">("left");
  const [floatOn, setFloatOn] = useState(true);
  const [floatSize, setFloatSize] = useState(20);
  const [bubbleOn, setBubbleOn] = useState(true);
  const [bubbleWidth, setBubbleWidth] = useState(20);
  const [iconDirection, setIconDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [enterAnim, setEnterAnim] = useState<"none" | "scale" | "fade">("scale");
  const [displayMode, setDisplayMode] = useState("always");

  const { data: appearance, loading, isPreview, refetch } = useApiResource("/sites", MOCK_APPEARANCE);

  const handleSave = useCallback(async () => {
    try {
      await apiMutate("/sites", "PATCH", {
        themeColor,
        buttonShape,
        iconPosition,
        floatOn,
        floatSize,
        bubbleOn,
        bubbleWidth,
        iconDirection,
        enterAnim,
        displayMode,
      });
    } catch (err: unknown) {
      if (!isPreviewModeError(err)) throw err;
    }
  }, [
    themeColor,
    buttonShape,
    iconPosition,
    floatOn,
    floatSize,
    bubbleOn,
    bubbleWidth,
    iconDirection,
    enterAnim,
    displayMode,
  ]);

  return (
    <div className="page-stack">
      <ConsoleDataModeBanner feature="官网 Widget 外观设置" />

      <PageHeader
        variant="compact"
        title="官网 Widget"
        description="自定义智能客服 Widget 的外观与预览效果"
      />

      <Breadcrumb items={["智能中心", "官网 Widget", "预览设置"]} />

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border">
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative -mb-px pb-3 text-sm font-medium transition-colors",
                active
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left - config panel */}
        <div className="rounded-card border border-border bg-card p-6 shadow-card">
          <h2 className="mb-5 text-base font-semibold">外观配置</h2>

          <div className="space-y-6">
            {/* 主题颜色 */}
            <div className="space-y-2">
              <Label htmlFor="theme-color">主题颜色</Label>
              <div className="flex items-center gap-3">
                <span
                  className="h-9 w-9 shrink-0 rounded-control border border-border shadow-sm"
                  style={{ backgroundColor: themeColor }}
                />
                <input
                  id="theme-color"
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value.toUpperCase())}
                  className="h-9 w-12 cursor-pointer rounded-control border border-input bg-background p-1"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value.toUpperCase())}
                  className="h-10 flex-1 rounded-control border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* 按钮形状 */}
            <div className="space-y-2">
              <Label>
                按钮形状 <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={buttonShape}
                onChange={setButtonShape}
                options={[
                  { value: "circle", label: "圆形" },
                  { value: "square", label: "方形" },
                ]}
              />
            </div>

            {/* 图标位置 */}
            <div className="space-y-2">
              <Label>图标位置</Label>
              <RadioGroup
                value={iconPosition}
                onChange={setIconPosition}
                options={[
                  { value: "left", label: "左侧" },
                  { value: "right", label: "右侧" },
                ]}
              />
            </div>

            {/* 悬浮按钮 */}
            <div className="flex items-center justify-between gap-4">
              <Label>悬浮按钮</Label>
              <Toggle checked={floatOn} onChange={setFloatOn} />
            </div>
            {floatOn ? (
              <div className="space-y-2 pl-1">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>大小</span>
                  <span className="font-medium text-foreground">{floatSize} px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={64}
                  value={floatSize}
                  onChange={(e) => setFloatSize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            ) : null}

            {/* 气泡设置 */}
            <div className="flex items-center justify-between gap-4">
              <Label>气泡设置</Label>
              <Toggle checked={bubbleOn} onChange={setBubbleOn} />
            </div>
            {bubbleOn ? (
              <div className="space-y-2 pl-1">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>宽度</span>
                  <span className="font-medium text-foreground">{bubbleWidth} px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={64}
                  value={bubbleWidth}
                  onChange={(e) => setBubbleWidth(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            ) : null}

            {/* 图标方向 */}
            <div className="space-y-2">
              <Label>图标方向</Label>
              <RadioGroup
                value={iconDirection}
                onChange={setIconDirection}
                options={[
                  { value: "horizontal", label: "水平（左→右）" },
                  { value: "vertical", label: "垂直（上→下）" },
                ]}
              />
            </div>

            {/* 进入动效 */}
            <div className="space-y-2">
              <Label>进入动效</Label>
              <RadioGroup
                value={enterAnim}
                onChange={setEnterAnim}
                options={[
                  { value: "none", label: "无（静态）" },
                  { value: "scale", label: "缩放" },
                  { value: "fade", label: "淡入" },
                ]}
              />
            </div>

            {/* 显示方式 */}
            <div className="space-y-2">
              <Label htmlFor="display-mode">显示方式</Label>
              <Select
                id="display-mode"
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value)}
              >
                <option value="always">始终显示</option>
                <option value="scroll">滚动后显示</option>
                <option value="exit">退出意图显示</option>
                <option value="manual">手动触发</option>
              </Select>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={() => undefined}>
              恢复默认
            </Button>
            <Button onClick={handleSave}>保存设置</Button>
          </div>
        </div>

        {/* Right - preview */}
        <div className="space-y-4">
          {/* Browser chrome mock */}
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-2 flex flex-1 items-center justify-between">
                <div className="h-5 flex-1 rounded-full bg-background/70 px-3 text-xs leading-5 text-muted-foreground">
                  https://www.example.com
                </div>
                <button
                  type="button"
                  className="ml-2 rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Simulated website content */}
            <div className="relative h-[360px] space-y-3 bg-background p-5">
              <div className="h-8 w-1/3 rounded bg-muted" />
              <div className="h-20 w-full rounded bg-muted/70" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 rounded bg-muted/60" />
                <div className="h-16 rounded bg-muted/60" />
                <div className="h-16 rounded bg-muted/60" />
              </div>
              <div className="h-4 w-2/3 rounded bg-muted/50" />
              <div className="h-4 w-1/2 rounded bg-muted/50" />

              {/* Floating chat widget bubble */}
              <button
                type="button"
                className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: themeColor }}
                aria-label="智能客服"
              >
                <MessageSquare className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 预览状态 */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold">预览状态</h3>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Checkbox checked label="桌面端" />
              <Checkbox checked label="在线" dot="bg-green-500" />
              <Checkbox checked label="移动端" />
              <Checkbox checked={false} label="离线" dot="bg-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
