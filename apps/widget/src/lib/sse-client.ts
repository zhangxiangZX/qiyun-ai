import type { SseEvent } from "./types";

export function parseSseChunk(buffer: string, onEvent: (event: SseEvent) => void): string {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const block of parts) {
    if (!block.trim()) continue;

    let eventName = "message";
    let dataLine = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLine = line.slice(5).trim();
    }

    if (!dataLine) continue;

    try {
      onEvent({ event: eventName, data: JSON.parse(dataLine) as Record<string, unknown> });
    } catch {
      /* ignore malformed chunks */
    }
  }

  return remainder;
}

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    const body = await response.text();
    parseSseChunk(`${body}\n\n`, onEvent);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    buffer = parseSseChunk(buffer, onEvent);
  }

  if (buffer.trim()) {
    parseSseChunk(`${buffer}\n\n`, onEvent);
  }
}
