export interface AcceptanceChecklistItem {
  id: string;
  group: "auth" | "data" | "chat" | "ops";
  label: string;
  href: string;
  note?: string;
  /** When true, item only applies in upstream mode. */
  upstreamOnly?: boolean;
}

export const upstreamAcceptanceChecklist: AcceptanceChecklistItem[] = [
  {
    id: "login-mode",
    group: "auth",
    label: "登录后顶栏显示「真实 API」模式徽章",
    href: "/dashboard",
    note: "需配置 API_BASE_URL 并重启 Console",
    upstreamOnly: true,
  },
  {
    id: "workspace-switch",
    group: "auth",
    label: "切换工作区后概览 / 列表数据随之变化",
    href: "/dashboard",
    upstreamOnly: true,
  },
  {
    id: "health",
    group: "ops",
    label: "系统状态页各依赖探针可读（API / Postgres / Redis / Qdrant / MinIO）",
    href: "/dashboard/system-status",
    upstreamOnly: true,
  },
  {
    id: "knowledge-upload",
    group: "data",
    label: "知识库：创建 → 上传文档 → 等待 ready",
    href: "/dashboard/knowledge-bases",
    upstreamOnly: true,
  },
  {
    id: "bot-save",
    group: "data",
    label: "机器人：编辑 behavior 保存 → 刷新后字段保持",
    href: "/dashboard/bots",
    upstreamOnly: true,
  },
  {
    id: "conversation-meta",
    group: "data",
    label: "会话：修改 status / tags → 刷新后保持",
    href: "/dashboard/conversations",
    upstreamOnly: true,
  },
  {
    id: "lead-patch",
    group: "data",
    label: "线索：打开详情 → PATCH 保存成功",
    href: "/dashboard/inquiries",
    upstreamOnly: true,
  },
  {
    id: "site-rotate",
    group: "chat",
    label: "站点：轮换密钥 → 完整 siteKey 仅显示一次 → 更新嵌入代码",
    href: "/dashboard/sites",
    upstreamOnly: true,
  },
  {
    id: "site-domains",
    group: "chat",
    label: "站点：保存域名白名单 → 测试消息通过 / 拦截未授权来源",
    href: "/dashboard/sites",
    upstreamOnly: true,
  },
  {
    id: "rate-limit-ui",
    group: "ops",
    label: "限流：连续触发 429 后 Console 显示 warning 提示且禁用重试",
    href: "/dashboard/sites",
    note: "可在站点测试消息或机器人预览快速连点验证",
    upstreamOnly: true,
  },
  {
    id: "rate-limit-api",
    group: "ops",
    label: "限流：公共聊天 / 登录 / 邀请接口返回 429 RATE_LIMITED",
    href: "/dashboard/system-status",
    note: "对照 docs/11-deployment.md §4 环境变量阈值",
    upstreamOnly: true,
  },
  {
    id: "chat-stream",
    group: "chat",
    label: "机器人预览：Upstream 模式下 SSE 流式回复与知识引用",
    href: "/dashboard/bots",
    note: "进入任一机器人详情页右侧预览",
    upstreamOnly: true,
  },
  {
    id: "team-invite",
    group: "auth",
    label: "团队：邀请成员 → 接受邀请链路",
    href: "/dashboard/team",
    upstreamOnly: true,
  },
  {
    id: "reports",
    group: "data",
    label: "报表：周期汇总与问题分析加载真实数据",
    href: "/dashboard/reports",
    upstreamOnly: true,
  },
];

export const deploymentWalkthroughGroups: Record<AcceptanceChecklistItem["group"], string> = {
  auth: "鉴权与工作区",
  ops: "部署与依赖",
  data: "业务数据链路",
  chat: "Widget / 聊天链路",
};

export const ACCEPTANCE_STORAGE_KEY = "qiyun-console-upstream-acceptance-v1";
