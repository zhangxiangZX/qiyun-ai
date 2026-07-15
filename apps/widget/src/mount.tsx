import { createRoot } from "react-dom/client";

import { WidgetRoot } from "./components/WidgetRoot";
import { parseWidgetConfig, validateWidgetConfig } from "./lib/config";
import widgetStyles from "./styles/widget.module.css?inline";

const HOST_STYLE_ID = "qiyun-widget-host-layout";

function ensureHostLayoutStyles(): void {
  if (document.getElementById(HOST_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = HOST_STYLE_ID;
  style.textContent = `
    #qiyun-widget-host {
      all: initial;
      position: fixed !important;
      inset: 0 !important;
      width: 0 !important;
      height: 0 !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
    }
  `;
  document.head.appendChild(style);
}

function applyHostLayout(host: HTMLElement): void {
  ensureHostLayoutStyles();
  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("inset", "0", "important");
  host.style.setProperty("width", "0", "important");
  host.style.setProperty("height", "0", "important");
  host.style.setProperty("overflow", "visible", "important");
  host.style.setProperty("pointer-events", "none", "important");
  host.style.setProperty("z-index", "2147483647", "important");
}

export function mountWidget(script: HTMLScriptElement): void {
  const config = parseWidgetConfig(script);
  if (!validateWidgetConfig(config)) {
    console.warn("[qiyun-widget] data-bot-id, data-site-key and api base are required.");
    return;
  }

  const host = document.createElement("div");
  host.id = "qiyun-widget-host";
  applyHostLayout(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = widgetStyles;

  const mountPoint = document.createElement("div");
  shadow.appendChild(style);
  shadow.appendChild(mountPoint);
  document.body.appendChild(host);

  createRoot(mountPoint).render(<WidgetRoot config={config} />);
}
