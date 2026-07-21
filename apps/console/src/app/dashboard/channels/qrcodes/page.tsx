import { redirect } from "next/navigation";

/** 二维码与销售链接为同一实体，统一入口到获客链接 Tab。 */
export default function QrcodeManagementPage() {
  redirect("/dashboard/channels/links?tab=qrcode");
}
