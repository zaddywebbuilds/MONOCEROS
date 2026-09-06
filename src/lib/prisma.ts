import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 connects through a driver adapter. A single client instance is
 * reused across hot reloads in development so the connection pool does not
 * grow on every file change.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure your PostgreSQL connection.",
    );
  }

  // Connection pool ceiling. Useful for serverless platforms and for managed
  // databases with a low connection limit; left to the driver default when unset.
  const poolMax = Number(process.env.DATABASE_POOL_MAX);

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      ...(Number.isFinite(poolMax) && poolMax > 0 ? { max: poolMax } : {}),
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** The transactional client handed to service functions inside $transaction. */
export type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
