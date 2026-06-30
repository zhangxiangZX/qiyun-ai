import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { type ApiRuntime } from "../main";
import { toChatHttpError } from "../chat/chat.api";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

async function readJsonBody(request: IncomingMessage): Promise<JsonValue> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? (JSON.parse(text) as JsonValue) : null;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendSse(response: ServerResponse, events: Array<{ event: string; data: unknown }>): void {
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");

  for (const event of events) {
    response.write(`event: ${event.event}\n`);
    response.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }

  response.end();
}

function getWorkspaceId(request: IncomingMessage): string | null {
  const value = request.headers["x-workspace-id"];
  return typeof value === "string" && value.trim() ? value : null;
}

export function createApiServer(runtime: ApiRuntime) {
  return createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (method === "POST" && url.pathname === "/public/chat/stream") {
        const body = (await readJsonBody(request)) as unknown as Parameters<
          ApiRuntime["publicChatApi"]["stream"]
        >[0];
        const result = await runtime.publicChatApi.stream(body);
        sendSse(response, result.events);
        return;
      }

      if (method === "POST" && url.pathname === "/public/leads") {
        const body = (await readJsonBody(request)) as unknown as Parameters<
          ApiRuntime["publicChatApi"]["submitLead"]
        >[0];
        const result = await runtime.publicChatApi.submitLead(body);
        sendJson(response, 201, result);
        return;
      }

      if (method === "GET" && url.pathname === "/conversations") {
        const workspaceId = getWorkspaceId(request);
        if (!workspaceId) {
          sendJson(response, 400, {
            code: "VALIDATION_ERROR",
            message: "X-Workspace-Id header is required.",
          });
          return;
        }

        sendJson(response, 200, await runtime.publicChatApi.listConversations(workspaceId));
        return;
      }

      if (method === "GET" && url.pathname.startsWith("/conversations/")) {
        const workspaceId = getWorkspaceId(request);
        if (!workspaceId) {
          sendJson(response, 400, {
            code: "VALIDATION_ERROR",
            message: "X-Workspace-Id header is required.",
          });
          return;
        }

        const conversationId = url.pathname.split("/")[2] ?? "";
        sendJson(response, 200, await runtime.publicChatApi.getConversation(workspaceId, conversationId));
        return;
      }

      sendJson(response, 404, {
        code: "NOT_FOUND",
        message: "Route not found.",
      });
    } catch (error) {
      const httpError = toChatHttpError(error);
      sendJson(response, httpError.statusCode, {
        code: httpError.code,
        message: httpError.message,
      });
    }
  });
}
