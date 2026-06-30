"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Alert, Button, Input, Label, cn } from "@qiyun/ui";

import { useBotEdit } from "@/components/bots/bot-edit-context";
import { knowledgeBaseOptions } from "@/lib/bots/mock-data";
import type { BotStatus } from "@/lib/bots/types";

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
  const { saving, saveMessage, saveBot } = useBotEdit();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void saveBot()} loading={saving}>
        保存设置
      </Button>
      {saveMessage ? <Alert variant="success" title={saveMessage} /> : null}
    </div>
  );
}

export function BotBasicsSection() {
  const { bot, updateBot } = useBotEdit();
  if (!bot) return null;

  return (
    <>
      <SectionCard title="基础设置" description="配置机器人名称、欢迎语与系统提示词。">
        <div className="space-y-2">
          <Label htmlFor="bot-name-edit">名称</Label>
          <Input
            id="bot-name-edit"
            value={bot.name}
            onChange={(event) => updateBot({ name: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-status">状态</Label>
          <select
            id="bot-status"
            className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
            value={bot.status}
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
            onChange={(event) => updateBot({ description: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-welcome">欢迎语</Label>
          <textarea
            id="bot-welcome"
            className={textareaClassName}
            value={bot.welcomeMessage}
            onChange={(event) => updateBot({ welcomeMessage: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-prompt">系统提示词</Label>
          <textarea
            id="bot-prompt"
            className={cn(textareaClassName, "min-h-[120px]")}
            value={bot.systemPrompt}
            onChange={(event) => updateBot({ systemPrompt: event.target.value })}
          />
        </div>
      </SectionCard>
      <SaveBar />
    </>
  );
}

export function BotKnowledgeSection() {
  const { bot, updateBot } = useBotEdit();
  if (!bot) return null;
  const currentBot = bot;

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
        <ul className="space-y-2">
          {knowledgeBaseOptions.map((option) => {
            const checked = bot.knowledgeBaseIds.includes(option.id);
            return (
              <li key={option.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-control border border-border/70 px-3 py-3 hover:bg-accent/40">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={checked}
                    onChange={() => toggleKnowledgeBase(option.id)}
                  />
                  <span className="text-sm font-medium text-card-foreground">{option.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {!knowledgeBaseOptions.length ? (
          <Alert variant="warning" title="还没有可关联的知识库，请先创建知识库。" />
        ) : null}
      </SectionCard>
      <SaveBar />
    </>
  );
}

export function BotBehaviorSection() {
  const { bot, updateBot } = useBotEdit();
  if (!bot) return null;

  return (
    <>
      <SectionCard title="行为与安全" description="配置无法回答时的留资策略、限流与域名白名单。">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input"
            checked={bot.collectLeadsOnFailure}
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
          <Label htmlFor="rate-limit">每分钟请求上限</Label>
          <Input
            id="rate-limit"
            type="number"
            min={1}
            value={bot.rateLimitPerMinute}
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
  const { bot, updateBot } = useBotEdit();
  if (!bot) return null;
  const currentBot = bot;

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
  const embedSnippet = bot.embedSnippet;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SectionCard title="安装代码" description="复制以下脚本并粘贴到官网页面。">
      <pre className="overflow-x-auto rounded-control border border-border bg-muted/40 p-4 text-xs text-card-foreground">
        {bot.embedSnippet}
      </pre>
      <Button variant="outline" onClick={() => void handleCopy()}>
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "已复制" : "复制代码"}
      </Button>
      <Alert
        variant="info"
        title="部署提示"
      >
        更换域名后需同步更新白名单并保存，非白名单来源的请求会被拒绝。
      </Alert>
    </SectionCard>
  );
}
