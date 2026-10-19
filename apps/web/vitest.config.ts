import { defineConfig } from "vitest/config";

// unit tests live next to the code (src/**/*.test.ts); browser tests in e2e/ run with Playwright, not Vitest
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], exclude: ["e2e/**", "node_modules/**"] },
});
