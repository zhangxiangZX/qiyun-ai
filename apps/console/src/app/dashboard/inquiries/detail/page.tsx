import { redirect } from "next/navigation";

/** 无 id 的 detail 死链，统一回询盘列表；真实详情走 /dashboard/inquiries/[id]。 */
export default function InquiryDetailPage() {
  redirect("/dashboard/inquiries");
}
