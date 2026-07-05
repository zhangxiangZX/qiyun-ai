import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredDocument {
  storageKey: string;
  sizeBytes: number;
}

export interface DocumentStorageHealth {
  status: "ok" | "skipped" | "error";
  driver: "local" | "minio";
  detail: string;
}

export interface RemovedDocumentStorageObject {
  action: "deleted" | "archived";
  archivedStorageKey: string | null;
}

export interface DocumentStorage {
  save(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    fileName: string;
    contentBytes: Uint8Array;
  }): Promise<StoredDocument>;
  read(storageKey: string): Promise<Uint8Array>;
  remove(
    storageKey: string,
    strategy?: "delete" | "archive",
  ): Promise<RemovedDocumentStorageObject>;
  healthCheck(): Promise<DocumentStorageHealth>;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function buildStorageKey(input: {
  workspaceId: string;
  knowledgeBaseId: string;
  fileName: string;
}): string {
  return [
    sanitizePathSegment(input.workspaceId),
    sanitizePathSegment(input.knowledgeBaseId),
    `${Date.now()}-${sanitizePathSegment(input.fileName)}`,
  ].join("/");
}

function getStorageRoot(): string {
  return process.env.DOCUMENT_STORAGE_DIR?.trim() || path.resolve(process.cwd(), ".data", "documents");
}

function getDocumentDeleteStrategy(
  env: Record<string, string | undefined> = process.env,
): "delete" | "archive" {
  return env.DOCUMENT_DELETE_STRATEGY?.trim().toLowerCase() === "archive"
    ? "archive"
    : "delete";
}

function buildArchiveStorageKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  return `archive/${Date.now()}-${normalized}`;
}

function sha256Hex(input: Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key: Uint8Array | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function toAmzDate(now: Date): { full: string; short: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    full: iso,
    short: iso.slice(0, 8),
  };
}

function encodeS3Path(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
    .replace(/%2F/g, "/");
}

function buildCanonicalQuery(searchParams: URLSearchParams): string {
  return [...searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    })
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}

export function getDocumentStorageDriver(
  env: Record<string, string | undefined> = process.env,
): "local" | "minio" {
  const raw = env.DOCUMENT_STORAGE_DRIVER?.trim().toLowerCase();
  if (raw === "local") return "local";
  if (raw === "minio") return "minio";
  return env.NODE_ENV === "test" ? "local" : "minio";
}

export class LocalDocumentStorage implements DocumentStorage {
  async save(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    fileName: string;
    contentBytes: Uint8Array;
  }): Promise<StoredDocument> {
    const storageKey = buildStorageKey(input);
    const fullPath = path.join(getStorageRoot(), storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.contentBytes);

    return {
      storageKey: storageKey.replace(/\\/g, "/"),
      sizeBytes: input.contentBytes.byteLength,
    };
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const fullPath = path.join(getStorageRoot(), storageKey);
    const content = await readFile(fullPath);
    return new Uint8Array(content);
  }

  async remove(
    storageKey: string,
    strategy = getDocumentDeleteStrategy(),
  ): Promise<RemovedDocumentStorageObject> {
    const fullPath = path.join(getStorageRoot(), storageKey);

    if (strategy === "archive") {
      const archivedStorageKey = buildArchiveStorageKey(storageKey);
      const archivedPath = path.join(getStorageRoot(), archivedStorageKey);
      try {
        await mkdir(path.dirname(archivedPath), { recursive: true });
        await rename(fullPath, archivedPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
      return {
        action: "archived",
        archivedStorageKey: archivedStorageKey.replace(/\\/g, "/"),
      };
    }

    try {
      await rm(fullPath, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return {
      action: "deleted",
      archivedStorageKey: null,
    };
  }

  async healthCheck(): Promise<DocumentStorageHealth> {
    const root = getStorageRoot();
    try {
      await mkdir(root, { recursive: true });
      return {
        status: "ok",
        driver: "local",
        detail: `Local document storage ready at ${root}.`,
      };
    } catch (error) {
      return {
        status: "error",
        driver: "local",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class MinioDocumentStorage implements DocumentStorage {
  private readonly endpoint: URL;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly bucket: string;
  private readonly region: string;
  private bucketEnsured = false;
  private ensureBucketPromise: Promise<void> | null = null;

  constructor(input?: {
    endpoint?: string;
    accessKey?: string;
    secretKey?: string;
    bucket?: string;
    region?: string;
  }) {
    this.endpoint = new URL(
      input?.endpoint?.trim() || process.env.MINIO_ENDPOINT?.trim() || "http://localhost:9000",
    );
    this.accessKey =
      input?.accessKey?.trim() || process.env.MINIO_ACCESS_KEY?.trim() || "";
    this.secretKey =
      input?.secretKey?.trim() || process.env.MINIO_SECRET_KEY?.trim() || "";
    this.bucket = input?.bucket?.trim() || process.env.MINIO_BUCKET?.trim() || "qiyun-ai";
    this.region = input?.region?.trim() || process.env.MINIO_REGION?.trim() || "us-east-1";
  }

  async save(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    fileName: string;
    contentBytes: Uint8Array;
  }): Promise<StoredDocument> {
    await this.ensureBucket();
    const storageKey = buildStorageKey(input);
    const response = await this.sendSignedRequest({
      method: "PUT",
      pathname: `/${this.bucket}/${storageKey}`,
      body: input.contentBytes,
    });

    if (!response.ok) {
      throw new Error(`MinIO upload failed with status ${response.status}.`);
    }

    return {
      storageKey,
      sizeBytes: input.contentBytes.byteLength,
    };
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const response = await this.sendSignedRequest({
      method: "GET",
      pathname: `/${this.bucket}/${storageKey}`,
    });

    if (response.status === 404) {
      throw new Error("Stored document not found in MinIO.");
    }

    if (!response.ok) {
      throw new Error(`MinIO read failed with status ${response.status}.`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  async remove(
    storageKey: string,
    strategy = getDocumentDeleteStrategy(),
  ): Promise<RemovedDocumentStorageObject> {
    if (strategy === "archive") {
      const archivedStorageKey = buildArchiveStorageKey(storageKey);
      const bytes = await this.read(storageKey);
      const archiveResponse = await this.sendSignedRequest({
        method: "PUT",
        pathname: `/${this.bucket}/${archivedStorageKey}`,
        body: bytes,
      });
      if (!archiveResponse.ok) {
        throw new Error(`MinIO archive upload failed with status ${archiveResponse.status}.`);
      }

      const cleanupResponse = await this.sendSignedRequest({
        method: "DELETE",
        pathname: `/${this.bucket}/${storageKey}`,
      });
      if (!cleanupResponse.ok && cleanupResponse.status !== 404) {
        throw new Error(`MinIO archive cleanup failed with status ${cleanupResponse.status}.`);
      }

      return {
        action: "archived",
        archivedStorageKey,
      };
    }

    const response = await this.sendSignedRequest({
      method: "DELETE",
      pathname: `/${this.bucket}/${storageKey}`,
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`MinIO delete failed with status ${response.status}.`);
    }
    return {
      action: "deleted",
      archivedStorageKey: null,
    };
  }

  async healthCheck(): Promise<DocumentStorageHealth> {
    if (!this.accessKey || !this.secretKey) {
      return {
        status: "error",
        driver: "minio",
        detail: "MINIO_ACCESS_KEY or MINIO_SECRET_KEY is not configured.",
      };
    }

    try {
      const head = await this.sendSignedRequest({
        method: "HEAD",
        pathname: `/${this.bucket}`,
      });

      if (head.ok) {
        return {
          status: "ok",
          driver: "minio",
          detail: `MinIO bucket "${this.bucket}" is reachable at ${this.endpoint.origin}.`,
        };
      }

      if (head.status === 404) {
        return {
          status: "ok",
          driver: "minio",
          detail: `MinIO is reachable; bucket "${this.bucket}" does not exist yet (created on first upload).`,
        };
      }

      return {
        status: "error",
        driver: "minio",
        detail: `MinIO bucket check failed with status ${head.status}.`,
      };
    } catch (error) {
      return {
        status: "error",
        driver: "minio",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) {
      return;
    }

    if (this.ensureBucketPromise) {
      return this.ensureBucketPromise;
    }

    this.ensureBucketPromise = (async () => {
      const head = await this.sendSignedRequest({
        method: "HEAD",
        pathname: `/${this.bucket}`,
      });

      if (head.ok) {
        return;
      }

      if (head.status !== 404) {
        throw new Error(`MinIO bucket check failed with status ${head.status}.`);
      }

      const create = await this.sendSignedRequest({
        method: "PUT",
        pathname: `/${this.bucket}`,
      });

      if (!create.ok && create.status !== 409) {
        throw new Error(`MinIO bucket create failed with status ${create.status}.`);
      }

      this.bucketEnsured = true;
    })();

    try {
      await this.ensureBucketPromise;
      this.bucketEnsured = true;
    } finally {
      this.ensureBucketPromise = null;
    }
  }

  private async sendSignedRequest(input: {
    method: "GET" | "PUT" | "HEAD" | "DELETE";
    pathname: string;
    body?: Uint8Array;
  }): Promise<Response> {
    const now = new Date();
    const amzDate = toAmzDate(now);
    const payloadHash = sha256Hex(input.body ?? "");

    const url = new URL(this.endpoint.toString());
    url.pathname = encodeS3Path(input.pathname);

    const canonicalUri = url.pathname;
    const canonicalQuery = buildCanonicalQuery(url.searchParams);
    const host = url.host;
    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate.full}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
      input.method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${amzDate.short}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate.full,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const dateKey = hmac(`AWS4${this.secretKey}`, amzDate.short);
    const regionKey = hmac(dateKey, this.region);
    const serviceKey = hmac(regionKey, "s3");
    const signingKey = hmac(serviceKey, "aws4_request");
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authorization =
      "AWS4-HMAC-SHA256 " +
      `Credential=${this.accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, ` +
      `Signature=${signature}`;

    return fetch(url, {
      method: input.method,
      headers: {
        authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate.full,
      },
      body: input.body,
    });
  }
}

export function createDocumentStorage(): DocumentStorage {
  return getDocumentStorageDriver() === "minio"
    ? new MinioDocumentStorage()
    : new LocalDocumentStorage();
}
