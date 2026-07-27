import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@npmax/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@npmax/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
});
