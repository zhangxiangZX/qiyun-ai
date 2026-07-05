import type { ChunkRecord, ReconcileChunksResult } from "./rag.types";

export type VectorIndexConsistencyTrigger = "startup" | "manual";

export interface VectorIndexWorkspaceSummary {
  workspaceId: string;
  chunkCount: number;
  documentCount: number;
  knowledgeBaseCount: number;
}

export interface VectorIndexConsistencyLogEvent {
  event: "vector_index.consistency";
  level: "info" | "warn";
  trigger: VectorIndexConsistencyTrigger;
  status: ReconcileChunksResult["status"];
  vectorDriver: "memory" | "qdrant";
  upserted: number;
  deleted: number;
  total: number;
  attempts: number;
  documentCount: number;
  knowledgeBaseCount: number;
  workspaceCount: number;
  workspaces: VectorIndexWorkspaceSummary[];
  error?: string;
  occurredAt: string;
}

export interface VectorIndexSyncSnapshot {
  reconcile: ReconcileChunksResult;
  vectorDriver: "memory" | "qdrant";
  workspaceSummary: VectorIndexWorkspaceSummary[];
  documentCount: number;
  knowledgeBaseCount: number;
}

export function summarizeChunksByWorkspace(
  chunks: ChunkRecord[],
): VectorIndexWorkspaceSummary[] {
  const grouped = new Map<
    string,
    { chunkCount: number; documentIds: Set<string>; knowledgeBaseIds: Set<string> }
  >();

  for (const chunk of chunks) {
    const current = grouped.get(chunk.workspaceId) ?? {
      chunkCount: 0,
      documentIds: new Set<string>(),
      knowledgeBaseIds: new Set<string>(),
    };
    current.chunkCount += 1;
    current.documentIds.add(chunk.documentId);
    current.knowledgeBaseIds.add(chunk.knowledgeBaseId);
    grouped.set(chunk.workspaceId, current);
  }

  return [...grouped.entries()]
    .map(([workspaceId, summary]) => ({
      workspaceId,
      chunkCount: summary.chunkCount,
      documentCount: summary.documentIds.size,
      knowledgeBaseCount: summary.knowledgeBaseIds.size,
    }))
    .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
}

export function buildVectorIndexSyncSnapshot(input: {
  chunks: ChunkRecord[];
  reconcile: ReconcileChunksResult;
  vectorDriver: "memory" | "qdrant";
}): VectorIndexSyncSnapshot {
  const workspaceSummary = summarizeChunksByWorkspace(input.chunks);

  return {
    reconcile: input.reconcile,
    vectorDriver: input.vectorDriver,
    workspaceSummary,
    documentCount: new Set(input.chunks.map((chunk) => chunk.documentId)).size,
    knowledgeBaseCount: new Set(input.chunks.map((chunk) => chunk.knowledgeBaseId)).size,
  };
}

export function buildVectorIndexConsistencyLog(input: {
  trigger: VectorIndexConsistencyTrigger;
  snapshot: VectorIndexSyncSnapshot;
  occurredAt?: string;
}): VectorIndexConsistencyLogEvent {
  const { snapshot, trigger } = input;
  const { reconcile } = snapshot;

  return {
    event: "vector_index.consistency",
    level: reconcile.status === "degraded" ? "warn" : "info",
    trigger,
    status: reconcile.status,
    vectorDriver: snapshot.vectorDriver,
    upserted: reconcile.upserted,
    deleted: reconcile.deleted,
    total: reconcile.total,
    attempts: reconcile.attempts,
    documentCount: snapshot.documentCount,
    knowledgeBaseCount: snapshot.knowledgeBaseCount,
    workspaceCount: snapshot.workspaceSummary.length,
    workspaces: snapshot.workspaceSummary,
    ...(reconcile.error ? { error: reconcile.error } : {}),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

export function formatVectorIndexConsistencyLogLine(
  event: VectorIndexConsistencyLogEvent,
): string {
  return `${JSON.stringify(event)}\n`;
}

export function emitVectorIndexConsistencyLog(
  event: VectorIndexConsistencyLogEvent,
  writers: {
    stdout?: Pick<NodeJS.WriteStream, "write">;
    stderr?: Pick<NodeJS.WriteStream, "write">;
  } = {},
): void {
  const line = formatVectorIndexConsistencyLogLine(event);
  const stdout = writers.stdout ?? process.stdout;
  const stderr = writers.stderr ?? process.stderr;

  if (event.level === "warn") {
    stderr.write(line);
    return;
  }

  stdout.write(line);
}
