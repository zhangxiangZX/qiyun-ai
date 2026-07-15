"use client";

import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { formatShortDateTime } from "@/lib/leads/format";
import type { LeadListItem } from "@/lib/leads/types";
import { cn } from "@qiyun/ui";

export interface LeadTableProps {
  leads: LeadListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LeadTable({ leads, selectedId, onSelect }: LeadTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">姓名</th>
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">联系方式</th>
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">来源机器人</th>
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">最近问题</th>
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">状态</th>
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">负责人</th>
              <th className="h-11 px-4 text-left font-medium text-muted-foreground">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className={cn(
                  "cursor-pointer border-b border-border transition-colors hover:bg-accent/40",
                  selectedId === lead.id && "bg-accent",
                )}
                onClick={() => onSelect(lead.id)}
              >
                <td className="px-4 py-3 font-medium">{lead.name}</td>
                <td className="px-4 py-3">{lead.contact}</td>
                <td className="px-4 py-3">{lead.sourceBot}</td>
                <td className="max-w-[220px] truncate px-4 py-3">{lead.lastQuestion}</td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3">{lead.assignee ?? "—"}</td>
                <td className="px-4 py-3">{formatShortDateTime(lead.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {leads.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelect(lead.id)}
            className={cn(
              "w-full min-h-[44px] rounded-card border border-border bg-card p-4 text-left shadow-sm transition-colors",
              selectedId === lead.id && "border-primary bg-accent/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-card-foreground">{lead.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{lead.contact}</p>
              </div>
              <LeadStatusBadge status={lead.status} />
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">来源</dt>
                <dd>{lead.sourceBot}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">最近问题</dt>
                <dd className="max-w-[60%] text-right">{lead.lastQuestion}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">负责人</dt>
                <dd>{lead.assignee ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">创建时间</dt>
                <dd>{formatShortDateTime(lead.createdAt)}</dd>
              </div>
            </dl>
          </button>
        ))}
      </div>
    </>
  );
}
