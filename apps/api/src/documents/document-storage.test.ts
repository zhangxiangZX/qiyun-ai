import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getDocumentStorageDriver,
  LocalDocumentStorage,
  MinioDocumentStorage,
} from "./document-storage";

test("document storage driver defaults to local in test env", () => {
  assert.equal(
    getDocumentStorageDriver({ NODE_ENV: "test" }),
    "local",
  );
});

test("document storage driver supports explicit minio override", () => {
  assert.equal(
    getDocumentStorageDriver({
      NODE_ENV: "development",
      DOCUMENT_STORAGE_DRIVER: "minio",
    }),
    "minio",
  );
});

test("local document storage can save and read bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qiyun-docs-"));
  const previous = process.env.DOCUMENT_STORAGE_DIR;
  process.env.DOCUMENT_STORAGE_DIR = root;

  try {
    const storage = new LocalDocumentStorage();
    const inputBytes = new TextEncoder().encode("hello qiyun");
    const stored = await storage.save({
      workspaceId: "ws_demo",
      knowledgeBaseId: "kb_demo",
      fileName: "hello.txt",
      contentBytes: inputBytes,
    });

    assert.ok(stored.storageKey.includes("ws_demo"));
    assert.equal(stored.sizeBytes, inputBytes.byteLength);

    const outputBytes = await storage.read(stored.storageKey, "ws_demo");
    assert.equal(
      new TextDecoder().decode(outputBytes),
      "hello qiyun",
    );
  } finally {
    if (previous === undefined) {
      delete process.env.DOCUMENT_STORAGE_DIR;
    } else {
      process.env.DOCUMENT_STORAGE_DIR = previous;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("local document storage can archive stored files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qiyun-docs-archive-"));
  const previousRoot = process.env.DOCUMENT_STORAGE_DIR;
  const previousStrategy = process.env.DOCUMENT_DELETE_STRATEGY;
  process.env.DOCUMENT_STORAGE_DIR = root;
  process.env.DOCUMENT_DELETE_STRATEGY = "archive";

  try {
    const storage = new LocalDocumentStorage();
    const stored = await storage.save({
      workspaceId: "ws_demo",
      knowledgeBaseId: "kb_demo",
      fileName: "archive.txt",
      contentBytes: new TextEncoder().encode("archive me"),
    });

    const removed = await storage.remove(stored.storageKey, "archive");
    assert.equal(removed.action, "archived");
    assert.ok(removed.archivedStorageKey);

    const outputBytes = await storage.read(removed.archivedStorageKey!, "ws_demo");
    assert.equal(new TextDecoder().decode(outputBytes), "archive me");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.DOCUMENT_STORAGE_DIR;
    } else {
      process.env.DOCUMENT_STORAGE_DIR = previousRoot;
    }
    if (previousStrategy === undefined) {
      delete process.env.DOCUMENT_DELETE_STRATEGY;
    } else {
      process.env.DOCUMENT_DELETE_STRATEGY = previousStrategy;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("local document storage healthCheck reports ok when root is writable", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qiyun-docs-health-"));
  const previous = process.env.DOCUMENT_STORAGE_DIR;
  process.env.DOCUMENT_STORAGE_DIR = root;

  try {
    const storage = new LocalDocumentStorage();
    const health = await storage.healthCheck();
    assert.equal(health.status, "ok");
    assert.equal(health.driver, "local");
    assert.match(health.detail, /Local document storage ready/);
  } finally {
    if (previous === undefined) {
      delete process.env.DOCUMENT_STORAGE_DIR;
    } else {
      process.env.DOCUMENT_STORAGE_DIR = previous;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("minio document storage healthCheck reports error when credentials are missing", async () => {
  const previousAccessKey = process.env.MINIO_ACCESS_KEY;
  const previousSecretKey = process.env.MINIO_SECRET_KEY;
  delete process.env.MINIO_ACCESS_KEY;
  delete process.env.MINIO_SECRET_KEY;

  try {
    const storage = new MinioDocumentStorage({
      endpoint: "http://localhost:9000",
      accessKey: "",
      secretKey: "",
      bucket: "qiyun-ai",
    });

    const health = await storage.healthCheck();
    assert.equal(health.status, "error");
    assert.equal(health.driver, "minio");
    assert.match(health.detail, /MINIO_ACCESS_KEY/);
  } finally {
    if (previousAccessKey === undefined) delete process.env.MINIO_ACCESS_KEY;
    else process.env.MINIO_ACCESS_KEY = previousAccessKey;
    if (previousSecretKey === undefined) delete process.env.MINIO_SECRET_KEY;
    else process.env.MINIO_SECRET_KEY = previousSecretKey;
  }
});

test("minio document storage healthCheck reports ok when bucket head succeeds", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const normalizedUrl = String(url);
    if (init?.method === "HEAD" && normalizedUrl.includes("/qiyun-ai")) {
      return new Response(null, { status: 200 });
    }
    return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
  }) as typeof fetch;

  try {
    const storage = new MinioDocumentStorage({
      endpoint: "http://localhost:9000",
      accessKey: "minioadmin",
      secretKey: "minioadmin",
      bucket: "qiyun-ai",
    });
    const health = await storage.healthCheck();
    assert.equal(health.status, "ok");
    assert.equal(health.driver, "minio");
    assert.match(health.detail, /reachable/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("minio document storage healthCheck treats missing bucket as reachable", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const normalizedUrl = String(url);
    if (init?.method === "HEAD" && normalizedUrl.includes("/qiyun-ai")) {
      return new Response(null, { status: 404 });
    }
    return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
  }) as typeof fetch;

  try {
    const storage = new MinioDocumentStorage({
      endpoint: "http://localhost:9000",
      accessKey: "minioadmin",
      secretKey: "minioadmin",
      bucket: "qiyun-ai",
    });
    const health = await storage.healthCheck();
    assert.equal(health.status, "ok");
    assert.match(health.detail, /does not exist yet/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
