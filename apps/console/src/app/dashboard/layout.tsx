import type { ReactNode } from "react";

import { ConsoleShell } from "@/components/layout/console-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
