import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: { ignorePatterns: ["**/*.{md,json,jsonc,yaml,yml,toml}"] },
  lint: {
    options: { typeAware: true, typeCheck: true },
    overrides: [{ files: ["apps/api/**", "infra/cdk/**", "scripts/**"], env: { node: true } }],
  },
  test: {
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts",
      "scripts/**/*.test.ts",
      "infra/**/*.test.ts",
    ],
    environment: "node",
  },
});
