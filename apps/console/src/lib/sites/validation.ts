export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export function isValidDomain(value: string): boolean {
  const domain = normalizeDomain(value);
  if (!domain) return false;
  if (domain === "localhost" || domain === "127.0.0.1") return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return true;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain);
}

export function parseDomainList(text: string): string[] {
  const domains = text
    .split(/[\n,]/)
    .map(normalizeDomain)
    .filter(Boolean);

  return [...new Set(domains)];
}

export function isOriginAllowed(origin: string, allowedDomains: string[]): boolean {
  const host = normalizeDomain(origin);
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
