import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * From Prisma 7 the connection URL lives here rather than in schema.prisma,
 * and the runtime client connects through a driver adapter (see src/lib/prisma.ts).
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx --tsconfig tsconfig.scripts.json prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
