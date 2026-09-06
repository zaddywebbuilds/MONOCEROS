import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Resolves a project-relative path to an absolute one on every platform. */
const resolve = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("./src"),
      // Service modules are marked `server-only` for the Next build; under the
      // test runner they run in plain Node, so the marker is a no-op here.
      "server-only": resolve("./scripts/server-only-shim.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
