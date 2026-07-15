import { cn } from "@qiyun/ui";

const intentClass = {
  high: "hot",
  medium: "mid",
  low: "low",
} as const;

export function V2IntentTag({
  level,
  label,
}: {
  level: "high" | "medium" | "low";
  label?: string;
}) {
  const labels = { high: "高意向", medium: "中意向", low: "低意向" };
  return <span className={cn("tag", intentClass[level])}>{label ?? labels[level]}</span>;
}

export function V2Tag({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "hot" | "mid" | "low" | "blue" | "gray";
}) {
  return <span className={cn("tag", tone)}>{children}</span>;
}
