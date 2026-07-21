import { redirect } from "next/navigation";

/** 成交漏斗已从 V1 交付导航移除；旧入口统一转到渠道分析。 */
export default function SalesDashboardPage() {
  redirect("/dashboard/reports/channel");
}
