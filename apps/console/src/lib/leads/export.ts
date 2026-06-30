import { formatLeadStatus, formatShortDateTime } from "./format";
import type { LeadDetail } from "./types";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportLeadsToCsv(leads: LeadDetail[], filename = "leads-export.csv"): void {
  const headers = [
    "姓名",
    "联系方式",
    "来源机器人",
    "最近问题",
    "状态",
    "负责人",
    "创建时间",
    "备注",
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.contact,
    lead.sourceBot,
    lead.lastQuestion,
    formatLeadStatus(lead.status),
    lead.assignee ?? "",
    formatShortDateTime(lead.createdAt),
    lead.notes,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
