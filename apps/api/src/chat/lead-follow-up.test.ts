import assert from "node:assert/strict";
import test from "node:test";

import {
  appendLeadFollowUpRecords,
  buildLeadMetaFollowUpChanges,
  createLeadCreatedFollowUp,
} from "./lead-follow-up";

test("createLeadCreatedFollowUp seeds system timeline entry", () => {
  const record = createLeadCreatedFollowUp("lead_1", "2026-07-04T00:00:00.000Z");
  assert.equal(record.kind, "system");
  assert.match(record.title, /线索已创建/);
});

test("buildLeadMetaFollowUpChanges appends status and note records", () => {
  const changes = buildLeadMetaFollowUpChanges({
    leadId: "lead_1",
    previous: { status: "new", assignee: null, notes: "" },
    next: { status: "contacted", assignee: "Alice", notes: "Called back." },
    updatedAt: "2026-07-04T01:00:00.000Z",
    actor: "user_1",
  });
  assert.equal(changes.length, 3);
  assert.ok(changes.some((item) => item.kind === "status"));
  assert.ok(changes.some((item) => item.kind === "assignee"));
  assert.ok(changes.some((item) => item.kind === "note"));
});

test("appendLeadFollowUpRecords keeps newest first", () => {
  const merged = appendLeadFollowUpRecords(
    [createLeadCreatedFollowUp("lead_1", "2026-07-04T00:00:00.000Z")],
    [
      {
        id: "follow-status-2",
        kind: "status",
        title: "状态：已联系",
        createdAt: "2026-07-04T02:00:00.000Z",
      },
    ],
  );
  assert.equal(merged[0]?.id, "follow-status-2");
});
