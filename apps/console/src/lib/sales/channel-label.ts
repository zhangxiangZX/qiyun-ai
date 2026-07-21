import type { ChannelAttributionItem, SourceType } from "@/lib/sales/types";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  website: "官网 Widget",
  douyin: "抖音",
  wechat: "微信",
  expo: "展会",
  sales_link: "销售链接",
  other: "其他",
};

export type SiteLabelLookup = {
  id: string;
  name?: string | null;
  botName?: string | null;
  allowedDomains?: string[];
};

/** 站点 ID / 未登记来源码 → 可读渠道名 */
export function isRawSiteSourceCode(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^site[_-]/i.test(value.trim());
}

export function formatChannelSourceLabel(
  item: Pick<ChannelAttributionItem, "sourceLabel" | "sourceCode" | "sourceType"> | {
    sourceLabel?: string | null;
    sourceCode?: string | null;
    sourceType?: SourceType | string | null;
  },
  sites: SiteLabelLookup[] = [],
): string {
  const raw = (item.sourceLabel ?? item.sourceCode ?? "").trim();
  const code = (item.sourceCode ?? "").trim();
  const candidate = raw || code;

  if (candidate) {
    const site = sites.find((entry) => entry.id === candidate || entry.id === code || entry.id === raw);
    if (site?.name?.trim()) return site.name.trim();
    if (site?.botName?.trim()) return `${site.botName.trim()} · 官网`;
    if (site?.allowedDomains?.length) return site.allowedDomains[0]!;
  }

  if (isRawSiteSourceCode(raw) || isRawSiteSourceCode(code)) {
    return SOURCE_TYPE_LABELS.website;
  }

  if (raw && !isRawSiteSourceCode(raw)) {
    // 后端有时把 sourceType 原文塞进 label
    return SOURCE_TYPE_LABELS[raw] ?? raw;
  }

  const type = item.sourceType ?? "other";
  return SOURCE_TYPE_LABELS[type] ?? String(type);
}
