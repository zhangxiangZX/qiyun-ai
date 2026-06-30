import type {
  ChunkRecord,
  QueryEmbeddingProvider,
  RetrievedChunk,
  VectorSearchStore,
} from "./rag.types";

function normalizeToken(token: string): string {
  return token.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s,.;:!?()[\]{}"'\r\n/\\-]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export class SimpleEmbeddingProvider implements QueryEmbeddingProvider {
  constructor(private readonly dimensions = 12) {}

  embedQuery(text: string): number[] {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = tokenize(text);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      let accumulator = 0;
      for (const character of token) {
        accumulator += character.charCodeAt(0);
      }

      const slot = accumulator % this.dimensions;
      vector[slot] = (vector[slot] ?? 0) + 1;
    }

    return vector.map((value) => value / tokens.length);
  }
}

export class InMemoryQdrantStore implements VectorSearchStore {
  constructor(private readonly chunks: () => ChunkRecord[]) {}

  search(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    queryVector: number[];
    topK: number;
  }): RetrievedChunk[] {
    const allowedKnowledgeBaseIds = new Set(input.knowledgeBaseIds);

    return this.chunks()
      .filter(
        (chunk) =>
          chunk.workspaceId === input.workspaceId &&
          allowedKnowledgeBaseIds.has(chunk.knowledgeBaseId),
      )
      .map((chunk) => ({
        chunkId: chunk.id,
        workspaceId: chunk.workspaceId,
        knowledgeBaseId: chunk.knowledgeBaseId,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        content: chunk.content,
        score: cosineSimilarity(input.queryVector, chunk.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);
  }
}

export function keywordOverlapScore(query: string, content: string): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return 0;
  }

  const contentTokens = new Set(tokenize(content));
  let matched = 0;

  for (const token of queryTokens) {
    if (contentTokens.has(token)) {
      matched += 1;
    }
  }

  return matched / queryTokens.size;
}
