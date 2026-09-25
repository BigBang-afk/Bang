import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    env: { DB_PATH: ":memory:", SEED_DEMO_DATA: "false", AI_PROVIDER: "demo" },
  },
});
