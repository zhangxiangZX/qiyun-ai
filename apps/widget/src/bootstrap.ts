import { mountWidget } from "./mount";

const script = document.currentScript;
if (script instanceof HTMLScriptElement) {
  mountWidget(script);
}
