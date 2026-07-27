import {
  getDefaultSelectionPageConfig,
  type SelectionPagePublicConfig,
} from "@/lib/channels/ai-selection-page-config";

export function getPublishedSelectionPageConfig(slug: string): SelectionPagePublicConfig | null {
  const defaults = getDefaultSelectionPageConfig(slug);
  if (!defaults) return null;

  return defaults;
}
