"use client";

import Link from "next/link";

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qiyun/ui";

import { formatLeadStatus, formatShortDateTime } from "@/lib/dashboard/format";
import type { RecentLead } from "@/lib/dashboard/types";

export interface DashboardRecentLeadsProps {
  leads: RecentLead[];
}

function statusVariant(status: RecentLead["status"]) {
  switch (status) {
    case "new":
      return "info" as const;
    case "following":
      return "warning" as const;
    case "won":
      return "success" as const;
    case "invalid":
      return "secondary" as const;
  }
}

export function DashboardRecentLeads({ leads }: DashboardRecentLeadsProps) {
  return (
    <section className="rounded-card border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">最近线索</h2>
          <p className="mt-1 text-sm text-muted-foreground">最新留资记录与跟进状态。</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/leads">查看全部</Link>
        </Button>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>联系方式</TableHead>
              <TableHead>来源机器人</TableHead>
              <TableHead>最近问题</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.contact}</TableCell>
                <TableCell>{lead.sourceBot}</TableCell>
                <TableCell className="max-w-[220px] truncate">{lead.lastQuestion}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
                </TableCell>
                <TableCell>{formatShortDateTime(lead.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {leads.map((lead) => (
          <article
            key={lead.id}
            className="rounded-control border border-border/70 bg-background/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-card-foreground">{lead.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{lead.contact}</p>
              </div>
              <Badge variant={statusVariant(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">来源</dt>
                <dd className="text-right text-card-foreground">{lead.sourceBot}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">最近问题</dt>
                <dd className="max-w-[60%] text-right text-card-foreground">{lead.lastQuestion}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">创建时间</dt>
                <dd className="text-right text-card-foreground">
                  {formatShortDateTime(lead.createdAt)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
