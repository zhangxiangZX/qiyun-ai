import type { ReactNode } from "react";

import { enforceRoleHomeAccess } from "@/server/role-home-guard";

export default async function AdminHomeLayout({ children }: { children: ReactNode }) {
  await enforceRoleHomeAccess("/dashboard/admin");
  return children;
}
