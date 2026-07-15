import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { FlatCompat } = require(path.resolve(
  __dirname,
  "../../node_modules/.pnpm/@eslint+eslintrc@3.3.5/node_modules/@eslint/eslintrc",
));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      "**/.next/**",
      "**/.next-prod/**",
      ".next/**",
      ".next-prod/**",
      "e2e/**",
      "**/e2e/**",
      "node_modules/**",
      "test-results/**",
      "**/test-results/**",
      "next-env.d.ts",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: ["src/components/auth/forgot-password-workspace.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "src/components/bots/selection-editor-workspace.tsx",
      "src/components/conversations/ai-test-workspace.tsx",
      "src/components/sites/add-site-workspace.tsx",
    ],
    rules: {
      "jsx-a11y/alt-text": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default config;
