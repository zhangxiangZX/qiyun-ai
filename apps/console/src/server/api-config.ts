export function getUpstreamApiBaseUrl(): string | null {
  const value = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) return null;
  return value.replace(/\/$/, "");
}
