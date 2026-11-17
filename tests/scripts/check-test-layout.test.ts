import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { checkTestLayout } from "../../scripts/check-test-layout.ts";

test("accepts mirrored tests and rejects misplaced tests without traversing dependencies", () => {
  const root = mkdtempSync(join(tmpdir(), "robotops-layout-"));
  try {
    for (const directory of ["tests/apps/api/src", "apps/api/src", "node_modules/example"])
      mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(join(root, "tests/apps/api/src/example.test.ts"), "");
    writeFileSync(join(root, "node_modules/example/example.test.ts"), "");
    expect(checkTestLayout(root)).toEqual([]);
    writeFileSync(join(root, "apps/api/src/example.spec.ts"), "");
    expect(checkTestLayout(root)).toEqual([
      "apps/api/src/example.spec.ts: move tests under tests/ using the source directory structure",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
