# Check a change

After the [initial setup](getting-started.md), run these commands at the
repository root:

```sh
pnpm run check
pnpm test
pnpm run toolchain:bundle
pnpm run toolchain:import
pnpm run security:dependencies
```

`check` runs Vite+ source formatting and typed lint, dprint documentation and
configuration formatting, strict TypeScript checks for all workspaces, and local
Markdown file links. It also validates the prek configuration. Link anchors and
remote URLs are not checked. Tests run once. CDK synthesizes and bundles the
example without AWS credentials; the import command runs
`tests/toolchain/import.ts` against the resulting bundle.
It invokes the handler with valid and invalid inputs and checks that only Node
built-ins remain external and that development tools are absent. CI runs this
integration check after synthesis; `pnpm test` runs the source unit tests.
Dependency audit fails on high or critical advisories, including development tools.
Investigate reports and fix the dependency graph rather than suppressing failures.

Run `pnpm run hooks:check` to execute the read-only manual stage against all tracked
files, as CI does. Built-in hooks reject filename case conflicts, merge conflict
markers, and new files larger than 1 MiB. The local validation hook runs
`pnpm run check` across the repository, including new source files.

Before a local commit, prek first applies Vite+ and dprint formatting and available
lint fixes, then runs the same validation. To run this locally without committing,
use `pnpm run hooks:fix`. If fixes change files, prek stops the commit so you can
review and stage the changes before retrying; it never stages fixes itself.
Validation failures without an automatic fix also block the commit. Hook
installation is covered in the getting-started guide. Neither stage runs unit
tests or bundle synthesis; CI runs those separately.

`docs:check` checks that local Markdown file links exist. Prek runs commands;
formatters and linters do not replace this link validation. Remote URLs and
heading anchors are outside its scope.

For individual checks, use `pnpm run format:check`, `pnpm run lint`,
`pnpm run typecheck`, or `pnpm run docs:check`. To apply fixes, run
`pnpm run fix` (format and lint) or `pnpm run format` (format only), then review the
diff and repeat the checks. These commands do not stage changes.

PRs targeting main run **PR checks / Repository checks**, using
`pnpm run hooks:check`, tests, bundle validation, and dependency auditing after a
frozen install.

Secret scanning runs only in CI through the official Gitleaks action. The workflow
pins the action by commit SHA and selects a specific scanner version. Checkout
fetches full history so the action can scan the PR commit range, including secrets
introduced and removed before the final revision. The root `.gitleaks.toml` keeps
built-in detection rules and excludes dependencies and generated output. Findings
are redacted; PR comments and scan artifact uploads are disabled. Developers need
no local Gitleaks installation.

The workflow uses the project-local Vite+, SHA-pinned
actions and read-only contents and pull-request permissions. Gitleaks uses GitHub's
automatically generated token to read PR metadata; no repository secrets or cloud
credentials are required.
Fork PRs use the same pull_request event; a maintainer may need to approve their
first run. Check failures in Actions logs. Hosted fork behavior and required
branch protection must be confirmed by the maintainer when the PR is published.
