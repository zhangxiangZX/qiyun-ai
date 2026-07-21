"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Star, X } from "lucide-react";
import { Badge, Button, Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@qiyun/ui";

import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { listQuoteTemplates } from "@/lib/quotes/api";
import { mockQuoteTemplates } from "@/lib/quotes/template-mock-data";
import type { QuoteTemplate } from "@/lib/quotes/template-types";

export interface QuoteTemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: QuoteTemplate) => void;
}

export function QuoteTemplatePicker({ open, onClose, onSelect }: QuoteTemplatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<QuoteTemplate[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoadError(null);
      try {
        const mode = await fetchConsoleMode().catch(() => null);
        if (mode && isPreviewMode(mode)) {
          setItems(mockQuoteTemplates);
          setUsingMock(true);
          return;
        }
        setItems(await listQuoteTemplates());
        setUsingMock(false);
      } catch {
        setItems([]);
        setUsingMock(false);
        setLoadError("模板列表加载失败。不会回退为假数据冒充可用模板。");
      }
    })();
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <DialogHeader>
        <DialogTitle>选择报价模板</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="关闭"
        >
          <X size={18} />
        </button>
      </DialogHeader>
      <DialogBody className="max-h-[60vh] overflow-auto">
        <p className="mb-3 text-xs text-muted-foreground">
          选择一个模板作为本次报价的版式基础。若创建接口尚未接收 templateId，选择仅影响本页展示。
        </p>
        {usingMock ? (
          <p className="mb-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            演示模式：当前展示本地示例模板，不会写入真实模板库。
          </p>
        ) : null}
        {loadError ? (
          <p className="mb-3 rounded-control border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {loadError}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((tpl) => {
            const active = selectedId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedId(tpl.id)}
                className={`relative flex flex-col items-start gap-2 rounded-card border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {active ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check size={13} />
                  </span>
                ) : null}
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: tpl.themeColor }}
                  >
                    <FileText size={15} />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{tpl.templateName}</span>
                      {tpl.isDefault ? (
                        <Badge
                          variant="default"
                          className="gap-0.5 bg-amber-100 px-1.5 py-0 text-[10px] text-amber-700"
                        >
                          <Star size={9} /> 默认
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      更新于 {tpl.updatedAt.slice(0, 10)}
                    </p>
                  </div>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">{tpl.description}</p>
                <div className="flex flex-wrap gap-1">
                  {tpl.fields.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {!items.length && !loadError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无可用模板</p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button
          disabled={!selectedId}
          onClick={() => {
            const tpl = items.find((t) => t.id === selectedId);
            if (tpl) onSelect(tpl);
          }}
        >
          应用模板
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
