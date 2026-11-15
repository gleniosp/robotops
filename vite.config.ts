import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  test: { include: ["tests/toolchain/**/*.test.ts"], environment: "node" },
});
