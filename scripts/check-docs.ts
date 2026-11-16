import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { pathToFileURL } from "node:url";

export function checkDocs(root: string): string[] {
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
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const text = readFileSync(path, "utf8");
      const label = relative(root, path);
      // Inline links/images and reference definitions; external URLs and anchors are excluded.
      const links = [
        ...text.matchAll(/!?\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g),
        ...text.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm),
      ];
      for (const match of links) {
        const target = match[1];
        if (!target || /^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) continue;
        try {
          const file = decodeURIComponent(target.split(/[?#]/)[0] ?? "");
          if (!existsSync(resolve(dirname(path), file)))
            failures.push(`${label}: missing link ${target}`);
        } catch {
          failures.push(`${label}: invalid link ${target}`);
        }
      }
    }
  }
  visit(root);
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const failures = checkDocs(process.cwd());
  for (const failure of failures) console.error(failure);
  if (failures.length) process.exitCode = 1;
}
