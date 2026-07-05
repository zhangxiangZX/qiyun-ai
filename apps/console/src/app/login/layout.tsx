import type { ReactNode } from "react";

import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AuthPageShell>{children}</AuthPageShell>;
}
