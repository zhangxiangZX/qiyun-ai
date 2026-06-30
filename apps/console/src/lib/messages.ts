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
  reports: {
    eyebrow: "数据分析",
    title: "报表",
    description: "按周期查看趋势、机器人表现与问题分析，支持导出复盘。",
    empty: {
      title: "暂无报表数据",
      description: "创建机器人并开始收集会话后，趋势与问题分析会显示在这里。",
    },
    error: {
      load: "报表数据加载失败，请稍后重试。",
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
  bots: {
    list: {
      title: "机器人",
      description: "管理客服机器人配置、关联知识库与嵌入安装。",
      create: "新建机器人",
      error: "机器人列表加载失败，请稍后重试。",
      empty: {
        title: "还没有机器人",
        description: "创建第一个机器人，配置知识库后即可部署到官网。",
        action: "创建第一个机器人",
      },
    },
    edit: {
      description: "左侧切换配置分区，右侧实时预览对话效果。",
      backToList: "返回列表",
      notFound: "未找到该机器人，可能已被删除或链接无效。",
    },
  },
  conversations: {
    title: "会话",
    description: "查看访客对话、引用来源、留资信息与处理状态。",
    error: {
      load: "会话列表加载失败，请稍后重试。",
    },
    empty: {
      title: "暂无会话",
      description: "部署机器人并开始接待访客后，会话记录会显示在这里。",
    },
    filters: {
      search: "搜索访客、摘要或机器人",
      bot: "机器人",
      allBots: "全部机器人",
      hasLead: "仅看已留资",
      unresolvedOnly: "仅看未解决",
    },
    detail: {
      title: "会话详情",
      empty: "选择会话后查看属性与留资信息",
    },
  },
  leads: {
    title: "线索",
    description: "管理访客留资记录，更新跟进状态并导出 CSV。",
    error: {
      load: "线索列表加载失败，请稍后重试。",
    },
    empty: {
      title: "暂无线索",
      description: "访客通过机器人提交留资后，记录会显示在这里。",
    },
    filters: {
      search: "搜索姓名、联系方式或问题",
      status: "状态",
      bot: "来源机器人",
      allBots: "全部机器人",
      assignee: "负责人",
      allAssignees: "全部负责人",
      unassigned: "未分配",
    },
    export: {
      action: "导出 CSV",
      empty: "当前筛选条件下没有可导出的线索。",
      success: "线索已导出",
    },
    detail: {
      status: "跟进状态",
      assignee: "负责人",
      notes: "备注",
      notesPlaceholder: "记录跟进情况、客户反馈或下一步动作",
      save: "保存",
      saved: "线索已更新",
      empty: "选择一条线索查看详情",
    },
  },
  sites: {
    title: "站点与嵌入",
    description: "配置域名白名单、复制嵌入代码，并发送测试消息验证 Widget。",
    selectBot: "选择机器人",
    error: {
      load: "站点配置加载失败，请稍后重试。",
    },
    empty: {
      title: "还没有站点配置",
      description: "创建机器人后，可在这里配置官网嵌入与白名单域名。",
    },
    domains: {
      title: "域名白名单",
      description: "仅允许白名单内的域名加载 Widget 并调用接口。",
      warning: "更换域名后必须点击保存；未保存时，非白名单来源仍会被拒绝。",
      add: "添加域名",
      save: "保存白名单",
      saved: "白名单已保存",
    },
    embed: {
      title: "嵌入代码",
      description: "复制脚本并粘贴到官网页面 </body> 前。",
      copy: "复制代码",
      copied: "已复制",
    },
    key: {
      title: "站点密钥",
      description: "密钥用于 Widget 鉴权，仅显示前缀。",
      hint: "轮换密钥后，旧嵌入代码将立即失效，请重新部署。",
      rotate: "轮换密钥",
      confirmTitle: "确认轮换站点密钥？",
      confirmDescription: "轮换后现有嵌入代码中的 siteKey 将失效，需要在所有站点重新部署。",
      rotated: "站点密钥已轮换，请更新嵌入代码。",
    },
    test: {
      title: "发送测试消息",
      description: "模拟 Widget 从指定域名发起请求，验证白名单是否生效。",
      origin: "模拟来源域名",
      message: "测试消息",
      send: "发送测试",
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
  reports: {
    eyebrow: "Analytics",
    title: "Reports",
    description: "Period trends, bot performance, and question analysis with export for review.",
    empty: {
      title: "No report data yet",
      description: "Create a bot and start collecting conversations to populate analytics.",
    },
    error: {
      load: "Failed to load report data. Please try again.",
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
  bots: {
    list: {
      title: "Bots",
      description: "Manage assistant configuration, knowledge bases, and embed setup.",
      create: "Create bot",
      error: "Failed to load bots. Please try again.",
      empty: {
        title: "No bots yet",
        description: "Create your first bot, attach a knowledge base, then deploy the widget.",
        action: "Create your first bot",
      },
    },
    edit: {
      description: "Switch sections on the left and preview conversations on the right.",
      backToList: "Back to list",
      notFound: "This bot could not be found. It may have been deleted.",
    },
  },
  conversations: {
    title: "Conversations",
    description: "Review visitor chats, citations, lead captures, and handling status.",
    error: {
      load: "Failed to load conversations. Please try again.",
    },
    empty: {
      title: "No conversations yet",
      description: "Deploy a bot and start receiving visitors to see conversation history here.",
    },
    filters: {
      search: "Search visitor, summary, or bot",
      bot: "Bot",
      allBots: "All bots",
      hasLead: "Lead captured only",
      unresolvedOnly: "Unresolved only",
    },
    detail: {
      title: "Conversation details",
      empty: "Select a conversation to view properties and lead info",
    },
  },
  leads: {
    title: "Leads",
    description: "Manage captured leads, update follow-up status, and export CSV.",
    error: {
      load: "Failed to load leads. Please try again.",
    },
    empty: {
      title: "No leads yet",
      description: "Lead records will appear here after visitors submit the capture form.",
    },
    filters: {
      search: "Search name, contact, or question",
      status: "Status",
      bot: "Source bot",
      allBots: "All bots",
      assignee: "Assignee",
      allAssignees: "All assignees",
      unassigned: "Unassigned",
    },
    export: {
      action: "Export CSV",
      empty: "No leads match the current filters.",
      success: "Leads exported",
    },
    detail: {
      status: "Status",
      assignee: "Assignee",
      notes: "Notes",
      notesPlaceholder: "Record follow-up context and next steps",
      save: "Save",
      saved: "Lead updated",
      empty: "Select a lead to view details",
    },
  },
  sites: {
    title: "Sites & Embed",
    description: "Manage domain allowlists, copy embed code, and send test messages.",
    selectBot: "Select bot",
    error: {
      load: "Failed to load site configuration. Please try again.",
    },
    empty: {
      title: "No site configuration yet",
      description: "After creating a bot, configure embed settings and allowed domains here.",
    },
    domains: {
      title: "Domain allowlist",
      description: "Only allowlisted domains can load the widget and call APIs.",
      warning: "You must save after changing domains. Unsaved domains will still be rejected.",
      add: "Add domain",
      save: "Save allowlist",
      saved: "Allowlist saved",
    },
    embed: {
      title: "Embed code",
      description: "Copy the script and paste it before </body> on your site.",
      copy: "Copy code",
      copied: "Copied",
    },
    key: {
      title: "Site key",
      description: "Used for widget authentication. Only the prefix is shown.",
      hint: "After rotation, old embed code stops working immediately.",
      rotate: "Rotate key",
      confirmTitle: "Rotate site key?",
      confirmDescription: "Existing embed code will stop working and must be redeployed everywhere.",
      rotated: "Site key rotated. Update your embed code.",
    },
    test: {
      title: "Send test message",
      description: "Simulate a widget request from a domain to verify the allowlist.",
      origin: "Simulated origin",
      message: "Test message",
      send: "Send test",
    },
  },
} as const;

export const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;
