import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // Next.js only resolves the "server-only" package's throwing guard via
      // its "react-server" bundler export condition; outside that bundler
      // (i.e. under Vitest) the plain `main` entry throws unconditionally.
      // Tests here always run in a server-like Node context, so alias it to
      // the package's own no-op "react-server" build rather than fighting
      // module resolution per test file.
      "server-only": path.resolve(dirname, "./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
