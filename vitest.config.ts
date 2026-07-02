import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirror the "@/*" path alias from tsconfig so tests import the same way the
// app does. Node environment is enough — these are pure-logic unit tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
