export type BotLoadState = "loading" | "ready" | "not_found" | "error";

export type BotEditShellView = "loading" | "ready" | "not_found" | "error";

export function resolveBotEditShellView(loadState: BotLoadState): BotEditShellView {
  return loadState;
}

export function classifyBotDetailFetch(
  detail: unknown,
  error: unknown,
): BotLoadState {
  if (error) return "error";
  if (!detail) return "not_found";
  return "ready";
}
