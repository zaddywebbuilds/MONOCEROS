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

function s3Driver(): StorageDriver {
  const env = serverEnv();

  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }

  const clientPromise = (async () => {
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
