const preset = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#dceeff",
          200: "#b8dcff",
          300: "#86c1ff",
          400: "#58a0ff",
          500: "#2f7dff",
          600: "#1f64eb",
          700: "#1d52c2",
          800: "#1d469c",
          900: "#1d3c7d",
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
    },
  },
};

export default preset;
