import { Suspense } from "react";
import { ForgotPasswordWorkspace } from "@/components/auth/forgot-password-workspace";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordWorkspace />
    </Suspense>
  );
}
