import { readdirSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** Reject misplaced runner tests instead of silently omitting them from discovery. */
export function checkTestLayout(root: string): string[] {
  const failures: string[] = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        ["node_modules", ".git", ".toolchain-out", "cdk.out", "dist", "coverage"].includes(
          entry.name,
        )
      )
        continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name) &&
        !relative(root, path).startsWith(`tests${sep}`)
      ) {
        failures.push(
          `${relative(root, path)}: move tests under tests/ using the source directory structure`,
        );
      }
    }
  }
  visit(root);
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const failures = checkTestLayout(process.cwd());
  for (const failure of failures) console.error(failure);
  if (failures.length) process.exitCode = 1;
}
