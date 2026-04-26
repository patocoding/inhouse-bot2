import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(new URL("./", import.meta.url)));

export default defineConfig({
  resolve: { alias: { "@": path.join(root) } },
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
});
