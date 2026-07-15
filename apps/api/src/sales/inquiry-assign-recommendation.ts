import type { WorkspaceMemberSummary } from "../auth/auth.types";
import type { InquiryAssignCandidate, InquiryRecord, IntentLevel } from "./sales.types";

export const ASSIGN_MAX_CAPACITY = 25;

type AssignableInquiry = Pick<InquiryRecord, "ownerId" | "status" | "intentLevel">;

function loadStatus(loadRate: number): InquiryAssignCandidate["status"] {
  if (loadRate >= 70) return "busy";
  if (loadRate >= 40) return "normal";
  return "idle";
}

function buildReason(input: {
  inquiryIntent: IntentLevel;
  highIntentLoad: number;
  totalLoad: number;
}): string {
  if (input.inquiryIntent === "high" && input.highIntentLoad <= 2) {
    return "高意向负载较轻，适合优先接手";
  }
  if (input.totalLoad <= 8) {
    return "当前负载较低，可快速响应";
  }
  if (input.totalLoad >= 18) {
    return "负载偏高，建议作为备选";
  }
  return "综合负载与角色匹配";
}

export function buildInquiryAssignCandidates(
  inquiry: Pick<InquiryRecord, "intentLevel" | "sourceType">,
  members: WorkspaceMemberSummary[],
  ownedInquiries: AssignableInquiry[],
): InquiryAssignCandidate[] {
  const assignable = members.filter(
    (member) => member.role === "owner" || member.role === "admin" || member.role === "member",
  );
  const loadMap = new Map<string, { total: number; high: number }>();
  for (const member of assignable) {
    loadMap.set(member.userId, { total: 0, high: 0 });
  }
  for (const item of ownedInquiries) {
    if (!item.ownerId || item.status !== "open") continue;
    const bucket = loadMap.get(item.ownerId);
    if (!bucket) continue;
    bucket.total += 1;
    if (item.intentLevel === "high") {
      bucket.high += 1;
    }
  }

  const candidates = assignable.map((member) => {
    const load = loadMap.get(member.userId) ?? { total: 0, high: 0 };
    const loadRate = Math.min(100, Math.round((load.total / ASSIGN_MAX_CAPACITY) * 100));
    let matchScore = Math.round(100 - loadRate * 0.55);
    if (inquiry.intentLevel === "high" && load.high <= 2) {
      matchScore += 12;
    }
    if (member.role === "admin") {
      matchScore += 3;
    }
    if (member.role === "owner" && assignable.length > 1) {
      matchScore -= 4;
    }
    matchScore = Math.min(99, Math.max(40, matchScore));

    return {
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      currentLoad: load.total,
      maxCapacity: ASSIGN_MAX_CAPACITY,
      loadRate,
      matchScore,
      status: loadStatus(loadRate),
      reason: buildReason({
        inquiryIntent: inquiry.intentLevel,
        highIntentLoad: load.high,
        totalLoad: load.total,
      }),
      recommended: false,
    };
  });

  candidates.sort(
    (left, right) =>
      right.matchScore - left.matchScore ||
      left.currentLoad - right.currentLoad ||
      left.name.localeCompare(right.name, "zh-CN"),
  );
  if (candidates[0]) {
    candidates[0].recommended = true;
  }
  return candidates;
}
