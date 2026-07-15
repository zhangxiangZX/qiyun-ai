const tsParser = require("./node_modules/.pnpm/@typescript-eslint+parser@8_9410a381aec59c2426422bbe2e0faab8/node_modules/@typescript-eslint/parser/dist/index.js");
const tsPlugin = require("./node_modules/.pnpm/@typescript-eslint+eslint-p_ed1245df00bb93e6154bb4d84ea060ca/node_modules/@typescript-eslint/eslint-plugin/dist/index.js");

module.exports = [
  {
    files: ["apps/api/src/**/*.ts", "apps/worker/src/**/*.ts"],
    ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
