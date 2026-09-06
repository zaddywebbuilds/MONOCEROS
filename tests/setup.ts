import "dotenv/config";

/**
 * Test environment.
 *
 * Unit tests need no database. They do need the environment variables the
 * modules under test read at import time, so anything missing gets a
 * deterministic test value here rather than being skipped.
 */

const env = process.env as Record<string, string | undefined>;

env.NODE_ENV ??= "test";
env.APP_URL ??= "http://localhost:3000";
env.AUTH_SECRET ??=
  "test-only-auth-secret-value-that-is-long-enough-to-pass-validation";
env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/monoceros_test";
env.EMAIL_PROVIDER ??= "console";
env.STORAGE_DRIVER ??= "local";
env.CRON_SECRET ??= "test-only-cron-secret-value";

/** True when a reachable database is configured for integration tests. */
export const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
