const VISITOR_KEY = "qiyun_visitor_id";

export function getOrCreateVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const visitorId = `v_${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}
