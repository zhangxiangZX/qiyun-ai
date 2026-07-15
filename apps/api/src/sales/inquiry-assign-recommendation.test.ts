import assert from "node:assert/strict";
import test from "node:test";

import type { WorkspaceMemberSummary } from "../auth/auth.types";
import { buildInquiryAssignCandidates } from "./inquiry-assign-recommendation";

const members: WorkspaceMemberSummary[] = [
  {
    userId: "u-1",
    name: "李娜",
    email: "lina@qiyun.com",
    role: "admin",
    status: "active",
    joinedAt: "2024-01-01T00:00:00.000Z",
    isCurrentUser: false,
  },
  {
    userId: "u-2",
    name: "王磊",
    email: "wanglei@qiyun.com",
    role: "member",
    status: "active",
    joinedAt: "2024-01-02T00:00:00.000Z",
    isCurrentUser: false,
  },
];

test("buildInquiryAssignCandidates prefers lower load member for high intent inquiry", () => {
  const candidates = buildInquiryAssignCandidates(
    { intentLevel: "high", sourceType: "website" },
    members,
    [
      { ownerId: "u-2", status: "open", intentLevel: "medium" },
      { ownerId: "u-2", status: "open", intentLevel: "high" },
      { ownerId: "u-2", status: "open", intentLevel: "medium" },
    ],
  );

  assert.equal(candidates[0]?.userId, "u-1");
  assert.equal(candidates[0]?.recommended, true);
  assert.ok(candidates[0]!.matchScore >= candidates[1]!.matchScore);
});
