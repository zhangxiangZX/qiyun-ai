import {
  getDefaultSelectionPageConfig,
  mergeSelectionPageConfig,
  type SelectionPagePublicConfig,
} from "@/lib/channels/ai-selection-page-config";

const overrides = new Map<string, SelectionPagePublicConfig>();

export function getPublishedSelectionPageConfig(slug: string): SelectionPagePublicConfig | null {
  const override = overrides.get(slug);
  if (override) return override;

  const defaults = getDefaultSelectionPageConfig(slug);
  if (!defaults) return null;

  return defaults;
}

export function saveSelectionPageConfig(config: SelectionPagePublicConfig): SelectionPagePublicConfig {
  const base = getDefaultSelectionPageConfig(config.slug);
  const merged = base ? mergeSelectionPageConfig(base, config) : config;
  overrides.set(config.slug, merged);
  return merged;
}

export function listSavedSelectionPageSlugs(): string[] {
  return Array.from(overrides.keys());
}
