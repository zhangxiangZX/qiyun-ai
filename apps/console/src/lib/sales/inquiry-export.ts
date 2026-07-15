import type { InquiryListItem } from "@/lib/sales/types";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const INTENT_LABELS: Record<string, string> = {
  high: "高意向",
  medium: "中意向",
  low: "低意向",
};

const STATUS_LABELS: Record<string, string> = {
  open: "进行中",
  closed: "已关闭",
};

export function exportInquiriesToCsv(
  items: InquiryListItem[],
  filename = `inquiries-export-${new Date().toISOString().slice(0, 10)}.csv`,
): void {
  const headers = [
    "客户名称",
    "意向等级",
    "状态",
    "负责人",
    "来源",
    "摘要",
    "创建时间",
    "下次跟进",
  ];

  const rows = items.map((item) => [
    item.customerName,
    INTENT_LABELS[item.intentLevel] ?? item.intentLevel,
    STATUS_LABELS[item.status] ?? item.status,
    item.ownerId ?? "未分配",
    item.sourceType,
    item.summary ?? "",
    item.createdAt,
    item.nextActionAt ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function filterInquiriesByDateRange(
  items: InquiryListItem[],
  from?: string,
  to?: string,
): InquiryListItem[] {
  if (!from && !to) return items;
  const fromMs = from ? Date.parse(`${from}T00:00:00`) : Number.NEGATIVE_INFINITY;
  const toMs = to ? Date.parse(`${to}T23:59:59`) : Number.POSITIVE_INFINITY;
  return items.filter((item) => {
    const created = Date.parse(item.createdAt);
    if (!Number.isFinite(created)) return true;
    return created >= fromMs && created <= toMs;
  });
}

export function defaultInquiryDateRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(from), to: fmt(to) };
}
