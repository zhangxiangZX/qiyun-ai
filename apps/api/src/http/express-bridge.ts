import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

import type { Request as ExpressRequest } from "express";

import type { ApiResult } from "./api-result";

function isExpressRequest(
  message: IncomingMessage,
): message is IncomingMessage & ExpressRequest {
  return "originalUrl" in message;
}

async function readRequestBody(message: IncomingMessage): Promise<Buffer> {
  if (isExpressRequest(message)) {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      message.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      message.on("end", () => resolve(Buffer.concat(chunks)));
      message.on("error", reject);
      message.resume();
    });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of message) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function incomingMessageToRequest(message: IncomingMessage): Promise<Request> {
  const method = message.method ?? "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(message.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  if (isExpressRequest(message)) {
    const path = message.url ?? message.originalUrl ?? "/";
    const url = `${message.protocol}://${message.get("host") ?? "localhost"}${path}`;
    let body: Buffer | undefined;

    if (method !== "GET" && method !== "HEAD") {
      if (message.body !== undefined && message.body !== null) {
        body = Buffer.from(
          typeof message.body === "string" ? message.body : JSON.stringify(message.body),
        );
      } else {
        body = await readRequestBody(message);
      }
    }

    return new Request(url, {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });
  }

  const protocol =
    (message.headers["x-forwarded-proto"] as string | undefined) ??
    ("encrypted" in message.socket && message.socket.encrypted ? "https" : "http");
  const host = message.headers.host ?? "localhost";
  const url = new URL(message.url ?? "/", `${protocol}://${host}`);

  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await readRequestBody(message);
  }

  return new Request(url, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });
}

export async function writeWebResponseToServer(
  response: Response,
  serverResponse: ServerResponse,
): Promise<void> {
  serverResponse.statusCode = response.status;
  response.headers.forEach((value, key) => {
    serverResponse.setHeader(key, value);
  });

  if (!response.body) {
    serverResponse.end();
    return;
  }

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (value) {
      serverResponse.write(Buffer.from(value));
    }
  }

  serverResponse.end();
}

export async function apiResultToServerResponse(
  result: ApiResult,
  serverResponse: ServerResponse,
): Promise<void> {
  serverResponse.statusCode = result.status;
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      serverResponse.setHeader(key, value);
    }
  }
  if (result.requestId) {
    serverResponse.setHeader("x-request-id", result.requestId);
  }

  if (result.stream) {
    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        serverResponse.write(Buffer.from(value));
      }
    }
    serverResponse.end();
    return;
  }

  if (result.text !== undefined) {
    serverResponse.end(result.text);
    return;
  }

  if (result.bytes !== undefined) {
    serverResponse.end(Buffer.from(result.bytes));
    return;
  }

  if (result.body === undefined) {
    serverResponse.end();
    return;
  }

  serverResponse.setHeader("content-type", "application/json; charset=utf-8");
  serverResponse.end(JSON.stringify(result.body));
}
