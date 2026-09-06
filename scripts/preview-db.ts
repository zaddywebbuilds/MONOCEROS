import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * Zero-install PostgreSQL for local previews and demos.
 *
 * Runs PGlite (Postgres compiled to WebAssembly) behind a TCP listener that
 * speaks the real Postgres wire protocol, so `pg` — and therefore Prisma —
 * connects to it exactly as it would to a normal server:
 *
 *   npm run preview:db          # leave running in one terminal
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
 *     npx prisma migrate deploy && npm run db:seed && npm run dev
 *
 * This is a DEVELOPMENT convenience only. Data lives in ./.preview-db and the
 * package is a devDependency — production uses a real PostgreSQL server.
 */

const PORT = Number(process.env.PREVIEW_DB_PORT ?? 5432);
const DATA_DIR = process.env.PREVIEW_DB_DIR ?? "./.preview-db";

async function main() {
  const db = await PGlite.create({ dataDir: DATA_DIR });
  await db.waitReady;

  const server = new PGLiteSocketServer({
    db,
    port: PORT,
    host: "127.0.0.1",
    // Default is 1, which is not enough for a connection pool.
    maxConnections: Number(process.env.PREVIEW_DB_MAX_CONNECTIONS ?? 20),
  });
  await server.start();

  console.info(`PGlite listening on 127.0.0.1:${PORT} (data in ${DATA_DIR})`);
  console.info("Connection string:");
  console.info(`  postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres\n`);
  console.info("Press Ctrl+C to stop.");

  const shutdown = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Preview database failed to start:", error);
  process.exitCode = 1;
});
