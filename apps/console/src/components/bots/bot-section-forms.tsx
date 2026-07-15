"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { Alert, Badge, Button, Input, Label, Skeleton, cn } from "@qiyun/ui";

import { useBotEdit } from "@/components/bots/bot-edit-context";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { isApiError } from "@/lib/api/errors";
import { WIDGET_ASSET_VERSION } from "@/generated/widget-version";
import type { BotStatus } from "@/lib/bots/types";
import { listKnowledgeBases } from "@/lib/knowledge/api";
import {
  getKnowledgeBaseStatusBadgeVariant,
  KNOWLEDGE_BASE_STATUS_LABELS,
} from "@/lib/knowledge/status-labels";
import type { KnowledgeBase } from "@/lib/knowledge/types";

const textareaClassName =
  "flex min-h-[96px] w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function SaveBar() {
  const { saving, saveMessage, saveError, persistenceEnabled, saveBot } = useBotEdit();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void saveBot()}
          loading={saving}
          disabled={!persistenceEnabled}
          className="min-h-11"
        >
          保存设置
        </Button>
      </div>
      {saveMessage ? <ConsoleFeedback variant="success" title={saveMessage} /> : null}
      {saveError ? <ConsoleRequestError message={saveError} /> : null}
    </div>
  );
}

export function BotBasicsSection() {
  const { bot, updateBot, extendedFieldsReadOnly, persistenceEnabled } = useBotEdit();
  if (!bot) return null;
  const readOnly = !persistenceEnabled || extendedFieldsReadOnly;

  return (
    <>
      <SectionCard title="基础设置" description="配置机器人名称、欢迎语与系统提示词。">
        <div className="space-y-2">
          <Label htmlFor="bot-name-edit">名称</Label>
          <Input
            id="bot-name-edit"
            value={bot.name}
            disabled={!persistenceEnabled}
            onChange={(event) => updateBot({ name: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-status">状态</Label>
          <select
            id="bot-status"
            className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
            value={bot.status}
            disabled={!persistenceEnabled}
            onChange={(event) => updateBot({ status: event.target.value as BotStatus })}
          >
            <option value="draft">草稿</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已停用</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-description">描述</Label>
          <textarea
            id="bot-description"
            className={textareaClassName}
            value={bot.description}
            disabled={readOnly}
            onChange={(event) => updateBot({ description: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-welcome">欢迎语</Label>
          <textarea
            id="bot-welcome"
            className={textareaClassName}
            value={bot.welcomeMessage}
            disabled={readOnly}
            onChange={(event) => updateBot({ welcomeMessage: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-recommended-questions">推荐问题（每行一个，最多 6 条）</Label>
          <textarea
            id="bot-recommended-questions"
            className={textareaClassName}
            value={bot.recommendedQuestions.join("\n")}
            disabled={readOnly}
            placeholder={"这款产品的技术参数是什么？\n支持非标定制吗？\n交货周期大概多久？"}
            onChange={(event) =>
              updateBot({
                recommendedQuestions: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 6),
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            访客首次打开 Widget 时可点击这些问题快速发起咨询。
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-prompt">系统提示词</Label>
          <textarea
            id="bot-prompt"
            className={cn(textareaClassName, "min-h-[120px]")}
            value={bot.systemPrompt}
            disabled={readOnly}
            onChange={(event) => updateBot({ systemPrompt: event.target.value })}
          />
        </div>
      </SectionCard>
      <SaveBar />
    </>
  );
}

export function BotKnowledgeSection() {
  const { bot, updateBot, persistenceEnabled } = useBotEdit();
  const [options, setOptions] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const bases = await listKnowledgeBases();
        if (!cancelled) {
          setOptions(bases);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            isApiError(error)
              ? error.message
              : "无法加载知识库列表，请稍后重试。",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!bot) return null;

  const currentBot = bot;
  const optionIds = new Set(options.map((item) => item.id));
  const missingIds = bot.knowledgeBaseIds.filter((id) => !optionIds.has(id));

  function toggleKnowledgeBase(id: string) {
    const next = currentBot.knowledgeBaseIds.includes(id)
      ? currentBot.knowledgeBaseIds.filter((item) => item !== id)
      : [...currentBot.knowledgeBaseIds, id];
    updateBot({
      knowledgeBaseIds: next,
      knowledgeBaseCount: next.length,
    });
  }

  return (
    <>
      <SectionCard title="关联知识库" description="选择机器人可检索的知识库范围。">
        {loadError ? <ConsoleRequestError message={loadError} /> : null}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-control" />
            <Skeleton className="h-12 w-full rounded-control" />
            <Skeleton className="h-12 w-full rounded-control" />
          </div>
        ) : (
          <ul className="space-y-2">
            {options.map((option) => {
              const checked = bot.knowledgeBaseIds.includes(option.id);
              const disabled = option.status === "disabled";

              return (
                <li key={option.id}>
                  <label
                    className={`flex items-center gap-3 rounded-control border border-border/70 px-3 py-3 ${
                      disabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-accent/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={checked}
                      disabled={disabled || !persistenceEnabled}
                      onChange={() => toggleKnowledgeBase(option.id)}
                    />
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-card-foreground">
                        {option.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {option.readyDocumentCount}/{option.documentCount} 可用
                      </span>
                    </span>
                    <Badge variant={getKnowledgeBaseStatusBadgeVariant(option.status)}>
                      {KNOWLEDGE_BASE_STATUS_LABELS[option.status]}
                    </Badge>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !options.length ? (
          <ConsoleEmptyState
            preset="noKnowledgeBases"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/knowledge-bases">前往知识库</Link>
              </Button>
            }
          />
        ) : null}

        {!loading && options.length ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/knowledge-bases/upload">上传文档</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/conversations/test">测试问答</Link>
            </Button>
          </div>
        ) : null}

        {!loading && missingIds.length ? (
          <Alert
            variant="warning"
            title="部分已关联知识库不可用"
            className="mt-4"
          >
            以下 ID 已失效或不在当前工作区：{missingIds.join(", ")}
          </Alert>
        ) : null}
      </SectionCard>
      <SaveBar />
    </>
  );
}

export function BotBehaviorSection() {
  const { bot, updateBot, extendedFieldsReadOnly, persistenceEnabled } = useBotEdit();
  if (!bot) return null;
  const readOnly = !persistenceEnabled || extendedFieldsReadOnly;

  return (
    <>
      <SectionCard title="行为与安全" description="配置无法回答时的留资策略、限流与域名白名单。">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input"
            checked={bot.collectLeadsOnFailure}
            disabled={readOnly}
            onChange={(event) => updateBot({ collectLeadsOnFailure: event.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium text-card-foreground">
              无法回答时收集线索
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              当知识库未命中时，引导访客填写留资表单。
            </span>
          </span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="llm-temperature">回复温度 (0-1)</Label>
          <Input
            id="llm-temperature"
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={bot.llmTemperature}
            disabled={readOnly}
            onChange={(event) =>
              updateBot({ llmTemperature: Number(event.target.value) || 0.3 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-output-tokens">最大输出 Token</Label>
          <Input
            id="max-output-tokens"
            type="number"
            min={128}
            max={4096}
            value={bot.maxOutputTokens}
            disabled={readOnly}
            onChange={(event) =>
              updateBot({ maxOutputTokens: Number(event.target.value) || 1024 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-limit">每分钟请求上限</Label>
          <Input
            id="rate-limit"
            type="number"
            min={1}
            value={bot.rateLimitPerMinute}
            disabled={readOnly}
            onChange={(event) =>
              updateBot({ rateLimitPerMinute: Number(event.target.value) || 1 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowed-domains">域名白名单（每行一个）</Label>
          <textarea
            id="allowed-domains"
            className={textareaClassName}
            value={bot.allowedDomains.join("\n")}
            disabled={readOnly}
            onChange={(event) =>
              updateBot({
                allowedDomains: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </SectionCard>
      <SaveBar />
    </>
  );
}

const leadFieldOptions = [
  { id: "name", label: "姓名" },
  { id: "phone", label: "手机号" },
  { id: "email", label: "邮箱" },
  { id: "company", label: "公司" },
];

export function BotLeadsSection() {
  const { bot, updateBot, extendedFieldsReadOnly, persistenceEnabled } = useBotEdit();
  if (!bot) return null;
  const currentBot = bot;
  const readOnly = !persistenceEnabled || extendedFieldsReadOnly;

  function toggleField(id: string) {
    const next = currentBot.leadFields.includes(id)
      ? currentBot.leadFields.filter((item) => item !== id)
      : [...currentBot.leadFields, id];
    updateBot({ leadFields: next });
  }

  return (
    <>
      <SectionCard title="留资表单" description="选择访客留资时需要填写的字段。">
        <ul className="grid gap-2 sm:grid-cols-2">
          {leadFieldOptions.map((field) => (
            <li key={field.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-control border border-border/70 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={bot.leadFields.includes(field.id)}
                  disabled={readOnly}
                  onChange={() => toggleField(field.id)}
                />
                <span className="text-sm font-medium">{field.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SaveBar />
    </>
  );
}

export function BotInstallSection() {
  const { bot } = useBotEdit();
  const [copied, setCopied] = useState(false);

  if (!bot) return null;

  const widgetScriptUrl =
    process.env.NEXT_PUBLIC_WIDGET_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3001";
  const widgetVersion = process.env.NEXT_PUBLIC_WIDGET_ASSET_VERSION?.trim() || WIDGET_ASSET_VERSION;
  const templateSnippet = `<script
  src="${widgetScriptUrl}/public/widget.js?v=${widgetVersion}"
  data-api-base="${widgetScriptUrl}"
  data-bot-id="${bot.id}"
  data-site-key="请从站点接入页复制完整 siteKey"
  async
></script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(templateSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SectionCard title="安装代码" description="将 Widget 挂到官网或其他网页。">
      <Alert variant="warning" title="请使用「站点接入」里的完整嵌入代码">
        机器人安装页只展示模板。完整脚本必须包含 <code className="font-mono text-xs">data-site-key</code>，
        且目标网页域名需加入白名单。请前往
        {" "}
        <Link href="/dashboard/sites" className="font-medium text-primary underline-offset-4 hover:underline">
          站点接入
        </Link>
        {" "}
        → 轮换 siteKey → 复制嵌入脚本 → 配置域名白名单并保存。
      </Alert>
      <pre className="overflow-x-auto rounded-control border border-border bg-muted/40 p-4 text-xs text-card-foreground">
        {templateSnippet}
      </pre>
      <Button variant="outline" onClick={() => void handleCopy()}>
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "已复制" : "复制模板"}
      </Button>
      <Alert variant="info" title="部署提示">
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>脚本放在目标页面 <code className="font-mono text-xs">&lt;/body&gt;</code> 之前。</li>
          <li>
            本地联调时 API 地址为 <code className="font-mono text-xs">{widgetScriptUrl}</code>
            ，其他电脑访问需改成局域网 IP 或公网域名，不能写 localhost。
          </li>
          <li>白名单需包含目标页面的域名或 IP（例如 <code className="font-mono text-xs">192.168.5.10</code>、<code className="font-mono text-xs">www.example.com</code>）。</li>
          <li>机器人状态需为「已启用」，否则 Widget 无法对话。</li>
        </ul>
      </Alert>
    </SectionCard>
  );
}
