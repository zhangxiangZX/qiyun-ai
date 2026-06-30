export interface SiteConfig {
  id: string;
  botId: string;
  botName: string;
  allowedDomains: string[];
  siteKeyPrefix: string;
  embedSnippet: string;
  updatedAt: string;
}

export interface TestMessageRequest {
  origin: string;
  message: string;
}

export type TestMessageResult =
  | { ok: true; reply: string; latencyMs: number }
  | { ok: false; code: 403 | 400; message: string };
