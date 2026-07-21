/** 头像本地兜底：API 未返回时，同浏览器刷新仍可回显。 */

const KEY_PREFIX = "qiyun.account.avatar.";

export function readStoredAvatar(userId: string | undefined | null): string {
  if (!userId || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(`${KEY_PREFIX}${userId}`) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredAvatar(userId: string | undefined | null, avatarUrl: string): void {
  if (!userId || typeof window === "undefined") return;
  try {
    if (!avatarUrl) {
      window.localStorage.removeItem(`${KEY_PREFIX}${userId}`);
      return;
    }
    window.localStorage.setItem(`${KEY_PREFIX}${userId}`, avatarUrl);
  } catch {
    // quota / private mode — ignore
  }
}
