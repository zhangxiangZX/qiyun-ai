"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LogIn } from "lucide-react";
import { Alert, Button, Input, Label } from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

type LoginStatus = "empty" | "idle" | "loading" | "error" | "success";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("empty");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (status === "success") {
      const timeout = window.setTimeout(() => {
        router.push("/dashboard");
      }, 900);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [router, status]);

  const isFormEmpty = email.trim().length === 0 && password.trim().length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setStatus("error");
      setErrorMessage(t(defaultLocale, "auth.form.validation.required"));
      return;
    }

    if (!email.includes("@")) {
      setStatus("error");
      setErrorMessage(t(defaultLocale, "auth.form.validation.email"));
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    await new Promise((resolve) => window.setTimeout(resolve, 850));

    if (password.length < 6) {
      setStatus("error");
      setErrorMessage(t(defaultLocale, "auth.form.validation.password"));
      return;
    }

    setStatus("success");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-dialog border border-border bg-card p-6 shadow-card"
    >
      {status === "empty" || (status === "idle" && isFormEmpty) ? (
        <div className="rounded-card border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {t(defaultLocale, "auth.form.empty")}
        </div>
      ) : null}

      {status === "error" ? (
        <Alert variant="error" title={t(defaultLocale, "auth.form.error")}>
          {errorMessage}
        </Alert>
      ) : null}

      {status === "success" ? (
        <Alert variant="success" title={t(defaultLocale, "auth.form.success.title")}>
          {t(defaultLocale, "auth.form.success.description")}
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">{t(defaultLocale, "auth.form.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setStatus("idle");
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t(defaultLocale, "auth.form.password")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setStatus("idle");
            }}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-muted-foreground transition hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t(defaultLocale, "auth.form.remember")}</span>
        <span>{t(defaultLocale, "auth.form.needHelp")}</span>
      </div>

      <Button
        type="submit"
        className="w-full"
        loading={status === "loading"}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        {status === "loading" ? t(defaultLocale, "auth.form.loading") : t(defaultLocale, "auth.form.submit")}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <LogIn className="h-3.5 w-3.5" />
        {t(defaultLocale, "auth.form.footer")}
      </div>
    </form>
  );
}
