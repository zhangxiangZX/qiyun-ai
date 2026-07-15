import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicWidgetConfigUrl } from "./widget-config-api";

test("buildPublicWidgetConfigUrl encodes bot config query params", () => {
  const url = buildPublicWidgetConfigUrl(
    {
      botId: "bot_1",
      siteKey: "pk_test",
      apiBase: "http://localhost:3001",
      title: "客服",
      welcome: "你好",
      accent: "#000",
      locale: "zh-CN",
    },
    "http://localhost:4173",
  );

  assert.equal(
    url,
    "http://localhost:3001/public/widget/config?botId=bot_1&siteKey=pk_test&origin=http%3A%2F%2Flocalhost%3A4173",
  );
});
