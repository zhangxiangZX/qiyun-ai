"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Alert, Button, Input, Label } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { isValidDomain, normalizeDomain } from "@/lib/sites/validation";

export interface DomainWhitelistCardProps {
  domains: string[];
  saving?: boolean;
  dirty?: boolean;
  readOnly?: boolean;
  readOnlyReason?: string;
  onChange: (domains: string[]) => void;
  onSave: () => void;
}

export function DomainWhitelistCard({
  domains,
  saving = false,
  dirty = false,
  readOnly = false,
  readOnlyReason,
  onChange,
  onSave,
}: DomainWhitelistCardProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) setError(null);
  }, [dirty]);

  function handleAdd() {
    const domain = normalizeDomain(input);
    if (!domain) return;

    if (!isValidDomain(domain)) {
      setError("域名格式不正确，例如 `www.example.com`。");
      return;
    }

    if (domains.includes(domain)) {
      setError("该域名已经在白名单中。");
      return;
    }

    onChange([...domains, domain]);
    setInput("");
    setError(null);
  }

  function handleRemove(domain: string) {
    onChange(domains.filter((item) => item !== domain));
  }

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-card-foreground">
        {t(defaultLocale, "sites.domains.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(defaultLocale, "sites.domains.description")}
      </p>

      <Alert variant="warning" title={t(defaultLocale, "sites.domains.warning")} className="mt-4" />

      {readOnly && readOnlyReason ? (
        <div className="mt-4">
          <ConsoleReadOnlyNotice title="只读" description={readOnlyReason} />
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="domain-input">{t(defaultLocale, "sites.domains.add")}</Label>
          <Input
            id="domain-input"
            value={input}
            placeholder="www.example.com"
            disabled={saving || readOnly}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>
        <Button type="button" className="mt-7" variant="outline" onClick={handleAdd} disabled={saving || readOnly}>
          <Plus className="h-4 w-4" aria-hidden />
          添加
        </Button>
      </div>

      {error ? <Alert variant="error" title={error} className="mt-3" /> : null}

      <ul className="mt-4 space-y-2">
        {domains.length ? (
          domains.map((domain) => (
            <li
              key={domain}
              className="flex items-center justify-between rounded-control border border-border/70 bg-background/60 px-3 py-2 text-sm"
            >
              <span className="font-mono">{domain}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`移除 ${domain}`}
                onClick={() => handleRemove(domain)}
                disabled={saving || readOnly}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))
        ) : (
          <li className="list-none">
            <ConsoleEmptyState preset="noDomains" />
          </li>
        )}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={onSave} loading={saving} disabled={!dirty || readOnly}>
          {t(defaultLocale, "sites.domains.save")}
        </Button>
        {dirty && !readOnly ? (
          <span className="text-sm text-warning">有未保存的域名变更</span>
        ) : null}
      </div>
    </section>
  );
}
