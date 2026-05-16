/**
 * Vitest config — keeps the test runner fast and self-contained. The repo
 * stays JS-first (no TypeScript) per the project's polyglot conventions.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
    testTimeout: 15_000,
    hookTimeout: 5_000,
  },
});
