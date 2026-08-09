import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Expose afterEach globally so Testing Library's auto-cleanup runs
    // between tests.
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only throws outside a React Server environment; tests exercise
      // the modules directly, so stub it out.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
