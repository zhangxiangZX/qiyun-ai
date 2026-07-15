export const WORKSPACE_PLAN_VALUES = ["standard", "professional", "enterprise"] as const;

export type WorkspacePlan = (typeof WORKSPACE_PLAN_VALUES)[number];

export const DEFAULT_WORKSPACE_PLAN: WorkspacePlan = "professional";

export function isValidWorkspacePlan(value: string): value is WorkspacePlan {
  return (WORKSPACE_PLAN_VALUES as readonly string[]).includes(value);
}
