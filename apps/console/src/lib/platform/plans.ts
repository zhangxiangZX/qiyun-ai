export const workspacePlanOptions = [
  { value: "standard", label: "标准版" },
  { value: "professional", label: "专业版" },
  { value: "enterprise", label: "企业版" },
] as const;

export const defaultWorkspacePlan = "professional";

export function workspacePlanLabel(plan: string | null | undefined): string {
  return workspacePlanOptions.find((option) => option.value === plan)?.label ?? "—";
}
