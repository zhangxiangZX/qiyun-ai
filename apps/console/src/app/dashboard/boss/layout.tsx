import type { ReactNode } from "react";

import { enforceRoleHomeAccess } from "@/server/role-home-guard";

export default async function BossHomeLayout({ children }: { children: ReactNode }) {
  await enforceRoleHomeAccess("/dashboard/boss");
  return children;
}
