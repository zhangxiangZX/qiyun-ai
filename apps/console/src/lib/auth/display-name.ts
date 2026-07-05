export function isCorruptedDisplayName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return true;
  return /^[?？\uFFFD]+$/.test(trimmed);
}

export function formatUserDisplayName(input: {
  name?: string | null;
  email?: string | null;
}): string {
  const name = input.name?.trim() ?? "";
  if (name && !isCorruptedDisplayName(name)) {
    return name;
  }

  const emailLocal = input.email?.split("@")[0]?.trim();
  if (emailLocal) {
    return emailLocal;
  }

  return "管理员";
}
