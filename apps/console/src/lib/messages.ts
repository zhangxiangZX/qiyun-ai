export type Locale = "zh-CN" | "en-US";

export const defaultLocale: Locale = "en-US";

const shared = {
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
    title: "Console Overview",
    description: "This is a usable placeholder console. Cursor will continue with interaction and API wiring.",
    empty: {
      title: "No recent conversations yet",
      description:
        "Create a bot and attach a knowledge base first, then connect the widget, chat stream, and lead capture flow.",
      action: "Create bot",
    },
  },
} as const;

export const messages = {
  "zh-CN": shared,
  "en-US": shared,
} as const;
