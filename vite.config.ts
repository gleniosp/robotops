import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: { ignorePatterns: ["**/*.{md,json,jsonc,yaml,yml,toml}"] },
  lint: {
    options: { typeAware: true, typeCheck: true },
    overrides: [
      { files: ["apps/api/**", "infra/cdk/**", "scripts/**", "tests/**"], env: { node: true } },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
