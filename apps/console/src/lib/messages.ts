export type Locale = "zh-CN" | "en-US";

export const defaultLocale: Locale = "zh-CN";

const zhCN = {
  shell: {
    brand: "企云 AI 企业智能服务平台",
    subtitle: "统一管理客服机器人、知识库、线索留资与会话数据。",
    workspace: "当前工作区",
    footer: "先把基础控制台做好，再逐步接入 RAG、SSE 和自动化能力。",
  },
  auth: {
    hero: {
      title: "把知识库、客服机器人和线索留资放进一个可交付的控制台。",
      description:
        "企云 AI 优先做好多租户隔离、检索问答、Widget 嵌入与会话留资，再逐步扩展工作流和 Agent 能力。",
    },
    form: {
      kicker: "控制台访问",
      title: "登录",
      email: "工作邮箱",
      password: "密码",
      submit: "进入控制台",
      loading: "正在验证账号...",
      remember: "记住我",
      needHelp: "忘记密码 / 联系管理员",
      footer: "登录成功后将跳转到数据看板。",
      empty: "请输入工作邮箱和密码。",
      error: "登录失败",
      success: {
        title: "登录成功",
        description: "正在跳转到数据看板...",
      },
      validation: {
        required: "请填写邮箱和密码。",
        email: "邮箱格式不正确。",
        password: "密码至少 6 位。",
      },
    },
  },
  dashboard: {
    eyebrow: "工作区概览",
    title: "数据看板",
    description: "查看会话、线索与知识库命中情况，快速发现需要补充的内容。",
    empty: {
      title: "还没有机器人",
      pageDescription: "创建第一个机器人后，这里就会开始显示会话和线索数据。",
      description: "先创建机器人并关联知识库，再部署 Widget 开始收集真实会话。",
      action: "创建第一个机器人",
    },
    leads: {
      empty: {
        title: "暂无最近线索",
        description: "访客提交留资后，最新记录会显示在这里。",
      },
    },
    error: {
      load: "看板数据加载失败，请稍后重试。",
      retry: "重新加载",
    },
  },
  topbar: {
    workspace: {
      label: "切换工作区",
    },
    notifications: {
      label: "通知",
    },
    search: "快速搜索",
    account: "运营账号",
    accountMenu: {
      label: "账号",
      profile: "个人设置",
      team: "团队成员",
      signOut: "退出登录",
    },
  },
} as const;

const enUS = {
  shell: {
    brand: "Qiyun AI Enterprise Platform",
    subtitle: "Unified console for customer support, knowledge base, and lead capture.",
    workspace: "Current workspace",
    footer: "Build the foundation first, then layer in RAG, SSE, and automation.",
  },
  auth: {
    hero: {
      title: "Bring knowledge bases, support bots, and lead capture into one deliverable console.",
      description:
        "Qiyun AI focuses on multi-tenant isolation, retrieval, widget embedding, and conversation capture first, then expands into workflows and richer Agent capabilities.",
    },
    form: {
      kicker: "Console Access",
      title: "Sign in",
      email: "Work email",
      password: "Password",
      submit: "Enter console",
      loading: "Verifying account...",
      remember: "Remember me",
      needHelp: "Forgot password / Contact admin",
      footer: "You will be redirected to the dashboard after login.",
      empty: "Enter your work email and password to continue.",
      error: "Sign-in failed",
      success: {
        title: "Signed in",
        description: "Redirecting you to the dashboard...",
      },
      validation: {
        required: "Please enter both email and password.",
        email: "That email format looks invalid.",
        password: "Password must be at least 6 characters.",
      },
    },
  },
  dashboard: {
    eyebrow: "Workspace Overview",
    title: "Dashboard",
    description: "Track sessions, leads, and knowledge coverage at a glance.",
    empty: {
      title: "No bots yet",
      pageDescription: "Create your first bot to start collecting dashboard metrics.",
      description:
        "Create a bot, attach a knowledge base, deploy the widget, and start capturing conversations and leads.",
      action: "Create your first bot",
    },
    leads: {
      empty: {
        title: "No recent leads",
        description: "New lead captures will appear here after visitors submit the form.",
      },
    },
    error: {
      load: "Failed to load dashboard data. Please try again.",
      retry: "Reload",
    },
  },
  topbar: {
    workspace: {
      label: "Switch workspace",
    },
    notifications: {
      label: "Notifications",
    },
    search: "Quick search",
    account: "Operator",
    accountMenu: {
      label: "Account",
      profile: "Profile settings",
      team: "Team members",
      signOut: "Sign out",
    },
  },
} as const;

export const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;
