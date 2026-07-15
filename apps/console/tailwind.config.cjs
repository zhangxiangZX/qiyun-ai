/** @type {import('tailwindcss').Config} */
const uiPreset = require("../../packages/ui/tailwind.preset.ts");

module.exports = {
  presets: [uiPreset.default ?? uiPreset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
