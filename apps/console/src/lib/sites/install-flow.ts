import { isValidDomain } from "./validation";

export const SITE_INSTALL_STEPS = [
  { id: "embed", title: "复制嵌入脚本" },
  { id: "domains", title: "配置域名白名单" },
  { id: "confirm", title: "安装确认" },
  { id: "errors", title: "常见错误" },
] as const;

export type SiteInstallStepId = (typeof SITE_INSTALL_STEPS)[number]["id"];

export const COMMON_SITE_INSTALL_ERRORS = [
  {
    title: "Widget 未显示",
    causes: [
      "脚本没有放在 </body> 前，或页面缓存还未刷新。",
      "siteKey 已轮换，但官网仍在使用旧 snippet。",
      "浏览器插件、CSP 或安全策略拦截了外部脚本。",
    ],
  },
  {
    title: "403 / 域名未授权",
    causes: [
      "当前 Origin 不在白名单中，含 www 与非 www 也要分别确认。",
      "白名单修改后还没有保存到服务端。",
      "本地联调用了 localhost，但白名单没有放行。",
    ],
  },
  {
    title: "Widget 能打开但无法发消息",
    causes: [
      "机器人仍是草稿或已停用状态。",
      "上游 API 不可达，或当前工作区未激活。",
      "网络、防火墙或代理拦截了 Widget 到 API 的请求。",
    ],
  },
] as const;

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface WidgetValidationCheck {
  id: "script" | "whitelist" | "message";
  title: string;
  description: string;
  status: "pending" | "pass" | "fail" | "running";
  detail: string;
}

export function resolveActiveDomains(
  draftDomains: string[],
  savedDomains: string[],
): string[] {
  return draftDomains.length ? draftDomains : savedDomains;
}

export function resolveDomainChecklist(input: {
  savedDomains: string[];
  draftDomains: string[];
  dirty: boolean;
}): { invalidDomains: string[]; items: ChecklistItem[] } {
  const activeDomains = resolveActiveDomains(input.draftDomains, input.savedDomains);
  const invalidDomains = activeDomains.filter((domain) => !isValidDomain(domain));

  return {
    invalidDomains,
    items: [
      {
        label: "至少配置一个合法域名",
        done: activeDomains.length > 0 && invalidDomains.length === 0,
      },
      {
        label: "白名单已保存到服务端",
        done: !input.dirty && input.savedDomains.length > 0,
      },
    ],
  };
}

export function resolveWidgetValidationChecks(input: {
  embedSnippet: string | null;
  savedDomains: string[];
  dirty: boolean;
  origin: string;
  scriptConfirmed: boolean;
  testLoading: boolean;
  testResult: { ok: true; reply: string; latencyMs: number } | { ok: false; code: 403 | 400; message: string } | null;
  testError: string | null;
}): WidgetValidationCheck[] {
  const whitelistPass =
    input.savedDomains.length > 0 &&
    !input.dirty &&
    !!input.origin &&
    input.savedDomains.includes(input.origin) &&
    isValidDomain(input.origin);

  const scriptStatus: WidgetValidationCheck["status"] =
    !input.embedSnippet || !input.scriptConfirmed ? "pending" : "pass";
  const whitelistStatus: WidgetValidationCheck["status"] = whitelistPass ? "pass" : "fail";
  const messageStatus: WidgetValidationCheck["status"] = input.testLoading
    ? "running"
    : input.testResult?.ok
      ? "pass"
      : input.testResult || input.testError
        ? "fail"
        : "pending";

  return [
    {
      id: "script",
      title: "官网已部署最新脚本",
      description: "确认官网页面已经加载当前 siteKey 对应的 Widget 脚本。",
      status: scriptStatus,
      detail: !input.embedSnippet
        ? "需要先轮换 siteKey，才能拿到一次性完整嵌入代码。"
        : input.scriptConfirmed
          ? "已确认官网能看到 Widget。"
          : "请在官网打开目标页面，确认 Widget 已正常出现。",
    },
    {
      id: "whitelist",
      title: "域名命中白名单",
      description: "当前 Origin 必须存在于已保存的域名白名单中。",
      status: whitelistStatus,
      detail: whitelistPass
        ? `${input.origin} 已在服务端白名单中。`
        : input.dirty
          ? "白名单还有未保存变更，请先保存。"
          : !input.savedDomains.length
            ? "还没有任何已保存域名。"
            : `${input.origin || "未选择域名"} 未通过白名单校验。`,
    },
    {
      id: "message",
      title: "测试消息可用",
      description: "通过站点测试能力验证 Widget 到后端的完整链路。",
      status: messageStatus,
      detail: input.testResult?.ok
        ? `成功 · ${input.testResult.latencyMs}ms · ${input.testResult.reply.slice(0, 48)}${input.testResult.reply.length > 48 ? "..." : ""}`
        : input.testResult && !input.testResult.ok
          ? `${input.testResult.code} · ${input.testResult.message}`
          : input.testError ?? (input.testLoading ? "正在发送测试消息..." : "尚未执行测试。"),
    },
  ];
}
