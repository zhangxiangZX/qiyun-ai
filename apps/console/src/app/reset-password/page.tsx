import { Suspense } from "react";
import { ForceResetPasswordWorkspace } from "@/components/auth/force-reset-password-workspace";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForceResetPasswordWorkspace />
    </Suspense>
  );
}
