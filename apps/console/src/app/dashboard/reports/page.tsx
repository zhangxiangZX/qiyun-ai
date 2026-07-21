import { redirect } from "next/navigation";

/** 报表中心旧 hub 对齐侧栏「渠道分析」。 */
export default function ReportsPage() {
  redirect("/dashboard/reports/channel");
}
