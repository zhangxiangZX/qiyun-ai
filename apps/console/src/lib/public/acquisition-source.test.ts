import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  WECHAT_OFFICIAL_ACCOUNT_SOURCE,
  appendAcquisitionSource,
  formatAcquisitionSourceLabel,
  resolveAcquisitionSource,
} from "./acquisition-source";

describe("acquisition-source", () => {
  it("resolves wechat_official_account and aliases", () => {
    assert.equal(
      resolveAcquisitionSource(new URLSearchParams("source=wechat_official_account")),
      WECHAT_OFFICIAL_ACCOUNT_SOURCE,
    );
    assert.equal(
      resolveAcquisitionSource(new URLSearchParams("source=wechat")),
      WECHAT_OFFICIAL_ACCOUNT_SOURCE,
    );
    assert.equal(
      resolveAcquisitionSource(new URLSearchParams("ch=douyin")),
      "douyin",
    );
  });

  it("appends source onto absolute and relative urls", () => {
    assert.equal(
      appendAcquisitionSource("https://example.com/s/demo", WECHAT_OFFICIAL_ACCOUNT_SOURCE),
      `https://example.com/s/demo?source=${WECHAT_OFFICIAL_ACCOUNT_SOURCE}`,
    );
    assert.equal(
      appendAcquisitionSource("/s/demo?preview=1", "xhs"),
      "/s/demo?preview=1&source=xhs",
    );
  });

  it("formats wechat label", () => {
    assert.equal(formatAcquisitionSourceLabel(WECHAT_OFFICIAL_ACCOUNT_SOURCE), "微信公众号");
  });
});
