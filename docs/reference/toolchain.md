# Development toolchain

`package.json` declares Node and pnpm through `engines.node` and `packageManager`.
The required project-local Vite+ dependency supplies formatting, linting, type
checks, and tests. Global Vite+ is an optional environment manager.

This reference describes configuration. `package.json` owns the command definitions.

## Dependencies and workspace

Direct dependencies are pinned in `package.json`; `pnpm-lock.yaml` pins the full
graph. Use pnpm to update them. Dependencies must be at least seven days old:
`pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`, enforces it for exact pins,
and rejects missing release timestamps. Do not add exemptions or edit lockfile
resolutions to bypass this policy.

This is a pnpm monorepo with a shared root `vite.config.ts`. The current code is
one [toolchain fixture](../../tests/toolchain/README.md). Application and shared
packages will be added as they gain consumers. Follow the [Vite+ monorepo guide](https://viteplus.dev/guide/monorepo):
package overrides belong in the shared root Vite+ configuration; CDK owns Lambda packaging. Vite+ is development
tooling and must stay out of runtime bundles.

`runtimeOnFail: ignore` and `pmOnFail: ignore` leave environment management to the
contributor's chosen tools instead of making pnpm download another copy.

## Compatibility notes

See [ADR-01](../adr/01-development-toolchain.md) for runtime choices, the scoped
CDK TypeScript exception, and the Vite peer warning. Use `pnpm exec vp --version`
to inspect bundled tools and their installed license files for license terms.
