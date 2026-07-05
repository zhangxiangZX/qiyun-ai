export type PanelLoadState = "loading" | "ready" | "error";

export type PanelContentKind = "loading" | "error" | "empty" | "data";

export function resolvePanelContentKind(
  state: PanelLoadState,
  itemCount: number,
): PanelContentKind {
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  return itemCount === 0 ? "empty" : "data";
}
