import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveDomainChecklist,
  resolveWidgetValidationChecks,
} from "@/lib/sites/install-flow";

test("resolveDomainChecklist detects valid saved domains and dirty state", () => {
  const clean = resolveDomainChecklist({
    savedDomains: ["www.example.com"],
    draftDomains: ["www.example.com"],
    dirty: false,
  });
  assert.deepEqual(clean.invalidDomains, []);
  assert.equal(clean.items.every((item) => item.done), true);

  const dirty = resolveDomainChecklist({
    savedDomains: ["www.example.com"],
    draftDomains: ["bad domain"],
    dirty: true,
  });
  assert.equal(dirty.invalidDomains.length, 1);
  assert.equal(dirty.items[0]?.done, false);
  assert.equal(dirty.items[1]?.done, false);
});

test("resolveWidgetValidationChecks reflects script, whitelist, and message states", () => {
  const pending = resolveWidgetValidationChecks({
    embedSnippet: null,
    savedDomains: [],
    dirty: false,
    origin: "",
    scriptConfirmed: false,
    testLoading: false,
    testResult: null,
    testError: null,
  });
  assert.equal(pending[0]?.status, "pending");
  assert.equal(pending[1]?.status, "fail");
  assert.equal(pending[2]?.status, "pending");

  const passing = resolveWidgetValidationChecks({
    embedSnippet: "<script></script>",
    savedDomains: ["www.example.com"],
    dirty: false,
    origin: "www.example.com",
    scriptConfirmed: true,
    testLoading: false,
    testResult: { ok: true, reply: "Widget ok", latencyMs: 812 },
    testError: null,
  });
  assert.equal(passing.every((item) => item.status === "pass"), true);

  const failedMessage = resolveWidgetValidationChecks({
    embedSnippet: "<script></script>",
    savedDomains: ["www.example.com"],
    dirty: false,
    origin: "www.example.com",
    scriptConfirmed: true,
    testLoading: false,
    testResult: { ok: false, code: 403, message: "Domain not allowed" },
    testError: null,
  });
  assert.equal(failedMessage[2]?.status, "fail");
  assert.match(failedMessage[2]?.detail ?? "", /403/);
});
