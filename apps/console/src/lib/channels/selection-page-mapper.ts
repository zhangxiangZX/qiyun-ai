import type { SelectionPageView } from "@/lib/bots/selection-pages-api";
import type { SelectionPageItem } from "@/lib/channels/ai-standalone-shared";

export function mapSelectionPageViewToItem(page: SelectionPageView): SelectionPageItem {
  return {
    id: page.id,
    slug: page.slug,
    name: page.name,
    editName: page.name,
    channels: "官网",
    botName: page.name,
    visits: 0,
    inquiries: 0,
    enabled: page.status === "published",
    published: page.status === "published",
    icon: "shield",
    pageUrl: `/s/${page.slug}`,
  };
}

export function slugifySelectionPageName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `selection-${Date.now()}`;
}

/** Unique public slug for newly created selection pages (ASCII-safe). */
export function buildUniqueSelectionSlug(pageName: string): string {
  const raw = slugifySelectionPageName(pageName)
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stem = raw || "selection";
  return `${stem}-${Date.now().toString(36)}`;
}
