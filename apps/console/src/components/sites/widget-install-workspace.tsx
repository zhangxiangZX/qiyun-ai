"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  MessageSquare,
} from "lucide-react";

import { Button } from "@qiyun/ui";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { BRAND_NAME, PUBLIC_API_URL, WIDGET_CDN_URL } from "@/lib/brand";

const STEPS = [
  { n: 1, text: "在「添加站点」中创建站点并绑定 AI 助手" },
  { n: 2, text: "配置域名白名单，确保仅授权域名可加载 Widget" },
  { n: 3, text: "复制下方嵌入代码，粘贴到官网 </body> 标签之前" },
  { n: 4, text: "发布网站后刷新页面，确认 Widget 正常显示" },
];

const EMBED_CODE = `<!-- ${BRAND_NAME} 官网 Widget -->
<script
  async
  src="${WIDGET_CDN_URL}/public/widget.js"
  data-api-base="${PUBLIC_API_URL}"
  data-site-key="YOUR_SITE_KEY"
></script>`;

export function WidgetInstallWorkspace() {
  const [copied, setCopied] = useState(false);
  const [copyNotice, setCopyNotice] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMBED_CODE);
      setCopied(true);
      setCopyNotice(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="官网 Widget 安装" />
        {copyNotice ? (
          <ConsoleFeedback
            variant="success"
            title="安装代码已复制"
            message="请将代码粘贴到官网模板中 </body> 标签之前，并替换 YOUR_SITE_KEY 为站点管理页显示的密钥。"
            onDismiss={() => setCopyNotice(false)}
          />
        ) : null}
      </ConsolePageAlerts>

      <header className="flex flex-wrap items-center gap-3 pt-4">
        <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0">
          <Link href="/dashboard/sites" aria-label="返回站点管理">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">Widget 安装说明</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            按步骤将 {BRAND_NAME} 智能客服嵌入企业官网，完整密钥与代码请在站点管理页获取。
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/sites/new">添加站点</Link>
        </Button>
      </header>

      <div className="space-y-6 pb-8">
        <section className="rounded-card border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">安装步骤</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {step.n}
                </span>
                <span className="pt-1 text-sm text-foreground">{step.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-card border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">嵌入代码示例</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            实际代码以站点管理页「安装代码」为准；创建或轮换密钥后会显示包含完整 siteKey 的片段。
          </p>
          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-control border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "已复制" : "复制代码"}
            </button>
            <pre className="overflow-x-auto rounded-control bg-muted/60 p-4 pt-12 font-mono text-[13px] leading-relaxed text-foreground">
              <code>{EMBED_CODE}</code>
            </pre>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void handleCopy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : "复制代码"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/sites">前往站点管理</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-foreground">安装效果预览</h2>
          <div className="relative h-64 overflow-hidden rounded-card border border-border bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="space-y-3 p-6">
              <div className="h-6 w-1/3 rounded bg-slate-200" />
              <div className="h-20 w-full rounded bg-slate-200/70" />
            </div>
            <div className="absolute bottom-5 right-5 flex items-end gap-3">
              <div className="max-w-[200px] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm shadow-md">
                您好，欢迎咨询 {BRAND_NAME}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg"
                aria-label="打开对话"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </ConsolePage>
  );
}
