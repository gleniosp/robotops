import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { checkDocs } from "./check-docs.ts";

test("rejects missing local and reference targets and ignores external links and anchors", () => {
  const root = mkdtempSync(join(tmpdir(), "robotops-docs-"));
  try {
    writeFileSync(
      join(root, "README.md"),
      "[missing](missing.md)\n[ref]: absent.md\n[web](https://example.com)\n[anchor](#here)",
    );
    expect(checkDocs(root)).toHaveLength(2);
    writeFileSync(join(root, "missing.md"), "");
    writeFileSync(join(root, "absent.md"), "");
    expect(checkDocs(root)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
