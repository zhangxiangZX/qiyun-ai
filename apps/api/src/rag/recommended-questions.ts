export const MAX_RECOMMENDED_QUESTIONS = 6;
export const MAX_RECOMMENDED_QUESTION_LENGTH = 120;

export function normalizeRecommendedQuestions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (!trimmed || trimmed.length > MAX_RECOMMENDED_QUESTION_LENGTH) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);

    if (result.length >= MAX_RECOMMENDED_QUESTIONS) {
      break;
    }
  }

  return result;
}
