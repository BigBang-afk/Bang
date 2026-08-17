import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20_000,
    // Every integration test shares ONE real, mutable Postgres database with no per-test
    // transaction rollback (see ARCHITECTURE.md's testing notes) — running test FILES in
    // parallel means two files' concurrent writes can land inside each other's aggregate
    // before/after read windows, producing test flakiness that has nothing to do with
    // application correctness (see PHASE-6-STATUS.md "Known issues" for the specific class of
    // failures this was causing). Serializing file execution removes that whole failure class;
    // the suite still finishes in well under a minute.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "server-only": path.resolve(dirname, "./tests/mocks/empty.ts"),
    },
  },
});
