const preset = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#dce9ff",
          200: "#b8d4ff",
          300: "#86b8ff",
          400: "#3b8cff",
          500: "#1266ff",
          600: "#0f55d9",
          700: "#0d46b3",
          800: "#0c3a92",
          900: "#0b3178",
        },
        neutral: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
        },
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        dialog: "var(--radius-dialog)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      maxWidth: {
        app: "var(--page-max-width)",
      },
      spacing: {
        page: "var(--page-padding)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      fontSize: {
        display: ["var(--fs-display)", { lineHeight: "var(--lh-tight)", fontWeight: "700" }],
        h1: ["var(--fs-h1)", { lineHeight: "var(--lh-snug)", fontWeight: "700" }],
        h2: ["var(--fs-h2)", { lineHeight: "var(--lh-snug)", fontWeight: "600" }],
        h3: ["var(--fs-h3)", { lineHeight: "var(--lh-snug)", fontWeight: "600" }],
        body: ["var(--fs-body)", { lineHeight: "var(--lh-base)" }],
        sm: ["var(--fs-sm)", { lineHeight: "var(--lh-base)" }],
        xs: ["var(--fs-xs)", { lineHeight: "var(--lh-snug)" }],
        caption: ["var(--fs-caption)", { lineHeight: "var(--lh-tight)" }],
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
          "50%": { boxShadow: "0 0 18px 2px hsl(var(--primary) / 0.14)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.48s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "fade-in": "fade-in 0.35s ease-out backwards",
        "scale-in": "scale-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "slide-in-down": "slide-in-down 0.38s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "glow-pulse": "glow-pulse 2.8s ease-in-out infinite",
      },
    },
  },
};

export default preset;
