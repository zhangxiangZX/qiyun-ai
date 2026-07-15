"use client";

import { useCallback, useEffect, useState } from "react";

import { Button, Input, PageHeader, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@qiyun/ui";

import {
  ConsolePage,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { createSource, fetchSourceAnalytics, formatAmount, listSources } from "@/lib/sales/api";
import type { SourceCodeItem } from "@/lib/sales/types";

export function ChannelsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [sources, setSources] = useState<SourceCodeItem[]>([]);
  const [analytics, setAnalytics] = useState<
    Array<{
      sourceLabel: string;
      inquiryCount: number;
      quoteCount: number;
      wonCount: number;
      wonAmountTotal: number | null;
      roi: number | null;
    }>
  >([]);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSources, nextAnalytics] = await Promise.all([
        listSources(),
        fetchSourceAnalytics(),
      ]);
      setSources(nextSources);
      setAnalytics(nextAnalytics);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ConsolePage>
      <PageHeader variant="compact" title="渠道询盘分析" description="来源码维度统计询盘、报价与成交；无投放成本时不显示 ROI。" />
      <ConsolePageSection className="space-y-6">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void createSource({ code, label: label || code, sourceType: "website" }).then(() => {
              setCode("");
              setLabel("");
              void load();
            });
          }}
        >
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="来源码，如 website-home" />
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="显示名称" />
          <Button type="submit" disabled={!code.trim()}>
            添加来源码
          </Button>
        </form>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <ConsoleRequestError {...resolveRequestErrorPresentation(error, "无法加载渠道数据。")} />
        ) : analytics.length === 0 ? (
          <ConsoleEmptyState preset="noReports" title="暂无渠道数据" description="配置来源码后，询盘将按渠道归因。" />
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>来源</TableHead>
                  <TableHead>询盘</TableHead>
                  <TableHead>报价</TableHead>
                  <TableHead>成交</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.map((item) => (
                  <TableRow key={item.sourceLabel}>
                    <TableCell>{item.sourceLabel}</TableCell>
                    <TableCell>{item.inquiryCount}</TableCell>
                    <TableCell>{item.quoteCount}</TableCell>
                    <TableCell>{item.wonCount}</TableCell>
                    <TableCell>{formatAmount(item.wonAmountTotal)}</TableCell>
                    <TableCell>{item.roi === null ? "—" : item.roi}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {sources.length > 0 ? (
          <section>
            <h3 className="font-medium">已配置来源码</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {sources.map((item) => (
                <li key={item.id}>
                  {item.label} ({item.code})
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </ConsolePageSection>
    </ConsolePage>
  );
}
