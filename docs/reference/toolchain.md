# Development toolchain

`package.json` declares Node and pnpm through `engines.node` and `packageManager`.
The required project-local Vite+ dependency supplies source formatting, linting,
type checks, and tests. Project-local dprint formats Markdown, JSON, YAML, and TOML;
prek runs the configured repository hooks. Global Vite+ is an optional environment manager.

This reference describes configuration. `package.json` owns the command definitions.

## Dependencies and workspace

Direct dependencies are pinned in `package.json`; `pnpm-lock.yaml` pins the full
graph. Use pnpm to update them. Dependencies must be at least seven days old:
`pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`, enforces it for exact pins,
and rejects missing release timestamps. Do not add exemptions or edit lockfile
resolutions to bypass this policy.

This is a pnpm monorepo with a shared root `vite.config.ts`. The current example
spans `packages/contracts`, `apps/api`, and `infra/cdk`.
The API consumes the shared schema; CDK packages the API boundary, and
[the bundle verifier](../../tests/README.md) invokes its output.
Product behavior remains planned. Follow the [Vite+ monorepo guide](https://viteplus.dev/guide/monorepo):
package overrides belong in the shared root Vite+ configuration; CDK owns Lambda packaging. Vite+ is development
tooling and must stay out of runtime bundles.

`runtimeOnFail: ignore` and `pmOnFail: ignore` leave environment management to the
contributor's chosen tools instead of making pnpm download another copy.

## Formatting and hooks

The root `vite.config.ts` owns source formatting and lint configuration. Its formatter
excludes the document and configuration formats owned by `dprint.json`, so a file
has one formatter. The dprint Oxc plugin is pinned by version and checksum; embedded
code formatting is disabled to leave source formatting with Vite+. Plugin releases
must also meet the seven-day release-age policy; pnpm cannot enforce age for a WASM URL.
The pnpm build allowlist permits dprint's installer to link its platform binary.
The first formatting run downloads and compiles the pinned plugin into dprint's
user cache; subsequent runs reuse it. Prek also writes its normal user cache.
Both require writable cache directories, and initial setup requires network access.

`prek.toml` combines built-in repository hygiene checks with the root check command.
The pre-commit stage applies formatting and lint fixes before validation; the manual
stage used by CI only validates. Hook priorities keep fixes ahead of checks.
The npm-installed runner uses existing project tools without downloading remote hook
repositories. VS Code recommends the Vite+ extension pack, which includes Oxc and Vitest,
alongside dprint and EditorConfig. Formatter settings mirror these owners.
The root `.editorconfig` provides UTF-8, LF, final-newline, two-space indentation,
and trailing-whitespace defaults only for files without a dedicated formatter.
See the [testing guide](../guides/testing.md) for commands and the
[getting-started guide](../guides/getting-started.md) for hook installation.

## Compatibility notes

See [ADR-01](../adr/01-development-toolchain.md) for runtime choices, the scoped
CDK TypeScript exception, and the Vite peer warning. Use `pnpm exec vp --version`
to inspect bundled tools and their installed license files for license terms.
