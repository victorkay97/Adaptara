import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: [
      ...configDefaults.exclude,
      "contracts/lib/**",
      "contracts/out/**",
      "contracts/cache/**",
      "contracts/broadcast/**",
    ],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
