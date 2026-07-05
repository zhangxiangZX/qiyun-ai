import type { ChatStreamEvent } from "./chat.types";

function encodeSseEvent(event: ChatStreamEvent): Uint8Array {
  const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
  return new TextEncoder().encode(payload);
}

export function createChatSseStream(
  events: ChatStreamEvent[],
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encodeSseEvent(event));
        await Promise.resolve();
      }

      controller.close();
    },
  });
}

export function createChatSseStreamFromAsync(
  events: AsyncIterable<ChatStreamEvent>,
  onComplete?: () => Promise<void>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encodeSseEvent(event));
        }
        if (onComplete) {
          await onComplete();
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
