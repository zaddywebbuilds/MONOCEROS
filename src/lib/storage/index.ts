import "server-only";

import { randomBytes } from "node:crypto";
import path from "node:path";

import { serverEnv } from "@/lib/env";

/**
 * Private document storage.
 *
 * KYC identity documents and payment proofs are NEVER written to /public and
 * never served as static assets. They are read back only through
 * /api/documents/[...] which enforces a role check and a short-lived signature.
 */

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface StorageDriver {
  name: string;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  remove(key: string): Promise<void>;
}

export const ALLOWED_DOCUMENT_MIME = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedDocumentMime = (typeof ALLOWED_DOCUMENT_MIME)[number];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** Magic-number check — the declared MIME type alone is not trusted. */
export function sniffMime(buffer: Buffer): AllowedDocumentMime | null {
  if (buffer.length < 8) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => buffer[i] === byte)) return "image/png";

  // PDF: %PDF-
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";

  return null;
}

/** Unguessable, namespaced object key. */
export function buildDocumentKey(scope: "kyc" | "payment-proof", userId: string, mime: string): string {
  const ext = EXTENSION_BY_MIME[mime] ?? "bin";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${scope}/${userId}/${stamp}-${randomBytes(16).toString("hex")}.${ext}`;
}

// ---------------------------------------------------------------------------
// Local filesystem driver (default)
// ---------------------------------------------------------------------------

function localDriver(): StorageDriver {
  const root = path.resolve(process.cwd(), serverEnv().STORAGE_LOCAL_DIR);

  const resolveKey = (key: string) => {
    const target = path.resolve(root, key);
    // Defence against path traversal in a key.
    if (!target.startsWith(root + path.sep) && target !== root) {
      throw new Error("Rejected storage key outside the storage root.");
    }
    return target;
  };

  return {
    name: "local",
    async put(key, body, _contentType) {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body, { mode: 0o600 });
    },
    async get(key) {
      const { readFile } = await import("node:fs/promises");
      try {
        const body = await readFile(resolveKey(key));
        const sniffed = sniffMime(body);
        return { body, contentType: sniffed ?? "application/octet-stream" };
      } catch {
        return null;
      }
    },
    async remove(key) {
      const { unlink } = await import("node:fs/promises");
      try {
        await unlink(resolveKey(key));
      } catch {
        /* already gone */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// S3-compatible driver (AWS S3, Cloudflare R2, Backblaze B2, MinIO)
// ---------------------------------------------------------------------------

let s3ClientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;

function s3Client() {
  if (s3ClientPromise) return s3ClientPromise;

  const env = serverEnv();
  s3ClientPromise = (async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
      },
    });
  })();

  return s3ClientPromise;
}

function s3Driver(): StorageDriver {
  const env = serverEnv();

  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }

  const clientPromise = s3Client();

  return {
    name: "s3",
    async put(key, body, contentType) {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await clientPromise;
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Objects are private; access is mediated by the application only.
          ACL: undefined,
        }),
      );
    },
    async get(key) {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await clientPromise;
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
        );
        const bytes = await result.Body?.transformToByteArray();
        if (!bytes) return null;
        const buffer = Buffer.from(bytes);
        return {
          body: buffer,
          contentType: result.ContentType ?? sniffMime(buffer) ?? "application/octet-stream",
        };
      } catch {
        return null;
      }
    },
    async remove(key) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await clientPromise;
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    },
  };
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  driver = serverEnv().STORAGE_DRIVER === "s3" ? s3Driver() : localDriver();
  return driver;
}

export type StorageStatus = {
  driver: "local" | "s3" | "unknown";
  durable: boolean;
  reason?: string;
};

/** A slow bucket must not hold the health check open until the monitor times out. */
const PROBE_TIMEOUT_MS = 3_000;

/**
 * Translate a failed probe into something safe to serve anonymously.
 *
 * The distinction that matters operationally is *why* the bucket is
 * unreachable: a rejected key needs a new token, a missing bucket needs it
 * re-created, and a timeout is usually the provider having a bad day. None of
 * those answers require naming the bucket, the endpoint or the key.
 */
function describeProbeFailure(error: unknown): string {
  const name = (error as { name?: string })?.name ?? "";
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
    ?.httpStatusCode;

  if (name === "TimeoutError" || name === "AbortError") {
    return "storage provider did not respond";
  }
  if (
    status === 401 ||
    status === 403 ||
    name === "InvalidAccessKeyId" ||
    name === "SignatureDoesNotMatch" ||
    name === "AccessDenied"
  ) {
    return "storage credentials were rejected";
  }
  if (status === 404 || name === "NotFound" || name === "NoSuchBucket") {
    return "storage bucket not found";
  }
  return "storage provider unreachable";
}

/**
 * Whether an uploaded document would still be readable tomorrow.
 *
 * Worth reporting because the failure is silent and delayed. The local driver
 * writes happily to a serverless host's temporary filesystem and returns
 * success; the KycSubmission row is created with a documentKey; and nothing at
 * all appears wrong until somebody opens the submission days later and the file
 * has evaporated. By then the investor has sent their passport and believes it
 * is held.
 *
 * For the s3 driver this actually reaches the bucket rather than trusting that
 * a populated set of environment variables means a working one. A revoked or
 * expired token looks identical to a healthy config from the outside, and the
 * whole point of the check is to notice before an investor does.
 *
 * Names the driver and the verdict, never a bucket, endpoint or key — the same
 * discipline as emailDeliveryStatus(), and for the same reason: this is served
 * to anonymous callers.
 */
export async function storageStatus(): Promise<StorageStatus> {
  let env: ReturnType<typeof serverEnv>;
  try {
    env = serverEnv();
  } catch {
    return { driver: "unknown", durable: false, reason: "environment is not readable" };
  }

  if (env.STORAGE_DRIVER === "s3") {
    const missing = [
      !env.S3_BUCKET && "S3_BUCKET",
      !env.S3_ACCESS_KEY_ID && "S3_ACCESS_KEY_ID",
      !env.S3_SECRET_ACCESS_KEY && "S3_SECRET_ACCESS_KEY",
    ].filter(Boolean);

    if (missing.length > 0) {
      return { driver: "s3", durable: false, reason: `missing ${missing.join(", ")}` };
    }

    try {
      const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
      const client = await s3Client();
      await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }), {
        abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      return { driver: "s3", durable: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[health] storage probe failed:", error);
      return { driver: "s3", durable: false, reason: describeProbeFailure(error) };
    }
  }

  // Vercel sets VERCEL=1 in every runtime. Its filesystem does not survive
  // between invocations, so a local driver there loses every upload.
  if (process.env.VERCEL === "1") {
    return {
      driver: "local",
      durable: false,
      reason: "local filesystem is discarded between requests on this host",
    };
  }

  return { driver: "local", durable: true };
}
