"use client";

import Link from "next/link";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qiyun/ui";

import type { ReportBotMetric } from "@/lib/reports/types";

export interface ReportsBotBreakdownProps {
  bots: ReportBotMetric[];
}

export function ReportsBotBreakdown({ bots }: ReportsBotBreakdownProps) {
  return (
    <section className="rounded-card border border-border/80 bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">机器人表现</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            按机器人对比近 7 日会话、线索转化与未解决问题数。
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/bots">管理机器人</Link>
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>机器人</TableHead>
              <TableHead>7 日会话</TableHead>
              <TableHead>7 日线索</TableHead>
              <TableHead>留资率</TableHead>
              <TableHead>平均响应</TableHead>
              <TableHead>未解决</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bots.map((bot) => (
              <TableRow key={bot.id}>
                <TableCell className="font-medium">{bot.botName}</TableCell>
                <TableCell>{bot.sessions7d}</TableCell>
                <TableCell>{bot.leads7d}</TableCell>
                <TableCell>{bot.leadRate}</TableCell>
                <TableCell>{bot.avgResponse}</TableCell>
                <TableCell>{bot.unresolvedCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
