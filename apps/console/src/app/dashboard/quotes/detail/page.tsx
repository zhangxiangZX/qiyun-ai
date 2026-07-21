import { redirect } from "next/navigation";

/** Mock 报价详情已下线，统一到报价列表；真实详情走 /dashboard/quotes/[id]。 */
export default function QuotationDetailPage() {
  redirect("/dashboard/quotes");
}
