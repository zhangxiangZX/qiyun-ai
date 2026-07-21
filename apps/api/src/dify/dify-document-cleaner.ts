import type { ParsedDocumentChunk } from "../documents/document.types";

export interface DocumentChunkCleanerInput {
  workspaceId: string;
  documentId: string;
  fileName: string;
  chunks: ParsedDocumentChunk[];
}

export interface DocumentChunkCleaner {
  cleanChunks(input: DocumentChunkCleanerInput): Promise<ParsedDocumentChunk[]>;
}

interface DifyWorkflowResponse {
  data?: {
    status?: string;
    outputs?: Record<string, unknown>;
    error?: string | null;
  };
}

export interface DifyDocumentCleanerOptions {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  outputVariable: string;
  failOpen: boolean;
  fetchImpl?: typeof fetch;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

function extractCleanedText(payload: DifyWorkflowResponse, outputVariable: string): string {
  if (payload.data?.status && payload.data.status !== "succeeded") {
    throw new Error(payload.data.error || `Dify workflow ended with ${payload.data.status}.`);
  }

  const value = payload.data?.outputs?.[outputVariable];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Dify workflow output "${outputVariable}" is missing or empty.`);
  }
  return value.trim();
}

export class DifyDocumentCleaner implements DocumentChunkCleaner {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: DifyDocumentCleanerOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async cleanChunks(input: DocumentChunkCleanerInput): Promise<ParsedDocumentChunk[]> {
    if (!this.options.enabled || !this.options.apiKey || input.chunks.length === 0) {
      return input.chunks;
    }

    const cleaned: ParsedDocumentChunk[] = [];
    for (const chunk of input.chunks) {
      try {
        const response = await this.fetchImpl(
          `${this.options.baseUrl.replace(/\/+$/, "")}/workflows/run`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${this.options.apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              inputs: {
                text: chunk.content,
                document_name: input.fileName,
                section_title: chunk.sectionTitle ?? "",
              },
              response_mode: "blocking",
              user: `qiyun:${input.workspaceId}`,
            }),
            signal: AbortSignal.timeout(this.options.timeoutMs),
          },
        );

        if (!response.ok) {
          throw new Error(`Dify workflow request failed with status ${response.status}.`);
        }

        const content = extractCleanedText(
          (await response.json()) as DifyWorkflowResponse,
          this.options.outputVariable,
        );
        cleaned.push({ ...chunk, content });
      } catch (error) {
        if (!this.options.failOpen) throw error;
        cleaned.push(chunk);
      }
    }

    return cleaned;
  }
}

export function createDifyDocumentCleanerFromEnv(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: typeof fetch,
): DocumentChunkCleaner {
  return new DifyDocumentCleaner({
    enabled: booleanValue(env.DIFY_ENABLED, false),
    baseUrl: env.DIFY_BASE_URL?.trim() || "https://api.dify.ai/v1",
    apiKey: env.DIFY_API_KEY?.trim() || "",
    timeoutMs: positiveInteger(env.DIFY_TIMEOUT_MS, 30_000),
    outputVariable: env.DIFY_CLEAN_OUTPUT_VARIABLE?.trim() || "cleaned_text",
    failOpen: booleanValue(env.DIFY_CLEAN_FAIL_OPEN, true),
    fetchImpl,
  });
}
