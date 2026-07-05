import { Badge } from "@qiyun/ui";
import { ArrowRight, MailPlus, ShieldCheck } from "lucide-react";

import { AcceptInvitePanel } from "@/components/auth/accept-invite-panel";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? null;

  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden border-b border-border bg-card px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(47,125,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <Badge variant="secondary" className="w-fit">
                <MailPlus className="mr-1.5 h-3.5 w-3.5" />
                工作区邀请
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                  顺畅完成从邀请到进入控制台
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  邀请详情、角色说明和下一步操作集中展示，避免从邮件跳转到控制台时丢失上下文。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  "公开 token 预检，登录前即可查看邀请状态",
                  "登录后按受邀邮箱自动匹配接受流程",
                  "过期、撤销等异常状态有明确说明",
                ].map((item) => (
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

            <div className="rounded-dialog border border-border bg-background/80 p-5 shadow-card backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">流程</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-card-foreground">
                邮件邀请
                <ArrowRight className="h-4 w-4 text-primary" />
                登录 / 注册
                <ArrowRight className="h-4 w-4 text-primary" />
                接受邀请
                <ArrowRight className="h-4 w-4 text-primary" />
                进入工作区
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Token 状态：{token ? "已提供" : "缺失"}。若 token 无效，右侧面板会说明下一步该怎么做。
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <AcceptInvitePanel token={token} />
        </section>
      </div>
    </main>
  );
}
