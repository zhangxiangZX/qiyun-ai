import type { QueryEmbeddingProvider } from "./rag.types";

const DEFAULT_EMBED_BATCH_SIZE = 32;

export async function embedTexts(
  provider: QueryEmbeddingProvider,
  texts: string[],
  batchSize = DEFAULT_EMBED_BATCH_SIZE,
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  if (provider.embedDocuments) {
    return provider.embedDocuments(texts);
  }

  const vectors: number[][] = [];
  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const batchVectors = await Promise.all(batch.map((text) => provider.embedQuery(text)));
    vectors.push(...batchVectors);
  }

  return vectors;
}

export function expandRetrievalQuery(query: string): string[] {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  const withoutPunctuation = normalized.replace(/[？?！!。,，;；:：]/g, " ").replace(/\s+/g, " ").trim();
  if (withoutPunctuation) {
    variants.add(withoutPunctuation);
  }

  const synonymPairs: Array<[RegExp, string]> = [
    [/怎么选|如何选|选型/g, "选型手册"],
    [/多少钱|价格|报价/g, "价格"],
    [/联系方式|怎么联系|电话/g, "联系"],
  ];

  for (const [pattern, replacement] of synonymPairs) {
    if (pattern.test(normalized)) {
      variants.add(`${normalized} ${replacement}`.trim());
    }
  }

  return [...variants];
}

export function fuseHybridScores(input: {
  vectorScore: number;
  keywordScore: number;
}): number {
  return Number((input.vectorScore * 0.65 + input.keywordScore * 0.35).toFixed(4));
}
