/**
 * Round-trip test for Cloudflare R2 / S3-compatible storage.
 *
 * Uploads a small file, downloads it, verifies the bytes match, then deletes
 * it. If all three succeed the credentials and bucket config are correct.
 *
 * IMPORTANT — this cannot test Production as-is. `vercel env pull` writes
 * "[SENSITIVE]" in place of any variable stored as a Secret, and the script
 * then fails with Access Denied for a reason that has nothing to do with the
 * real configuration. Supply the credentials directly instead:
 *
 *   $env:S3_BUCKET="monoceros-documents"
 *   $env:S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
 *   $env:S3_ACCESS_KEY_ID="..."
 *   $env:S3_SECRET_ACCESS_KEY="..."
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/test-r2.ts
 *
 * To check Production without holding its keys locally, read
 * /api/health instead — it probes the bucket from the server.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  // `vercel env pull` substitutes this for anything stored as a Secret. Caught
  // here so the run fails saying so, rather than as a confusing Access Denied.
  if (v === "[SENSITIVE]") {
    throw new Error(
      `${name} is the "[SENSITIVE]" placeholder written by \`vercel env pull\`, ` +
        `not a real value. Set it directly in your shell — see the header of this file.`,
    );
  }
  return v;
};

async function main() {
  const bucket   = required("S3_BUCKET");
  const endpoint = process.env.S3_ENDPOINT;
  const region   = process.env.S3_REGION ?? "auto";
  const accessKeyId     = required("S3_ACCESS_KEY_ID");
  const secretAccessKey = required("S3_SECRET_ACCESS_KEY");

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: false,
    credentials: { accessKeyId, secretAccessKey },
  });

  const key     = `_test/${randomBytes(8).toString("hex")}.txt`;
  const payload = Buffer.from(`r2-round-trip-test ${new Date().toISOString()}`);

  console.log(`Bucket:   ${bucket}`);
  console.log(`Endpoint: ${endpoint ?? "(default)"}`);
  console.log(`Key:      ${key}\n`);

  // 1. Upload
  process.stdout.write("PUT  ... ");
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: payload,
    ContentType: "text/plain",
  }));
  console.log("ok");

  // 2. Download and verify
  process.stdout.write("GET  ... ");
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes  = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error("GET returned no body");
  const got = Buffer.from(bytes);
  if (!got.equals(payload)) throw new Error(`Content mismatch: expected ${payload.length} bytes, got ${got.length}`);
  console.log(`ok (${got.length} bytes verified)`);

  // 3. Clean up
  process.stdout.write("DELETE ... ");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("ok");

  console.log("\n✓ R2 is working. Documents will survive between requests.");
}

main().catch((err) => {
  console.error("\n✗ Test failed:", err.message ?? err);
  process.exit(1);
});
