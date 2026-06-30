import { Badge } from "@qiyun/ui";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

const highlights = [
  "Multi-tenant workspace isolation",
  "RAG retrieval and citation tracing",
  "Widget embedding and lead capture",
  "Unified design tokens and review flow",
];

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden border-b border-border bg-card px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(47,125,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <Badge variant="secondary" className="w-fit">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Qiyun AI Enterprise Platform
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                  {t(defaultLocale, "auth.hero.title")}
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {t(defaultLocale, "auth.hero.description")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-card-foreground shadow-sm backdrop-blur"
                  >
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-dialog border border-border bg-background/80 p-5 shadow-card backdrop-blur-sm sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Access</p>
                <p className="text-sm font-medium text-card-foreground">Work email + role permissions</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Delivery</p>
                <p className="text-sm font-medium text-card-foreground">Ship MVP first, then expand Agent scope</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Next step</p>
                <p className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                  Console / knowledge base / bot
                  <ArrowRight className="h-4 w-4 text-primary" />
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-6 space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
                {t(defaultLocale, "auth.form.kicker")}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {t(defaultLocale, "auth.form.title")}
              </h2>
            </div>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
