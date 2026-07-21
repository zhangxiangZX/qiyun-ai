import type { ReactNode } from "react";

import { enforceRoleHomeAccess } from "@/server/role-home-guard";

export default async function SalesRepHomeLayout({ children }: { children: ReactNode }) {
  await enforceRoleHomeAccess("/dashboard/sales-rep");
  return children;
}
