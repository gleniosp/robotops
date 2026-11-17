# RobotOps agent guidance

Follow [the working agreement](docs/working-agreement.md).
Read the issue and [toolchain reference](docs/reference/toolchain.md) before changes.
Follow [documentation guidance](docs/AGENTS.md) when changing docs.
Follow the Vite+ monorepo guide for shared configuration and pnpm workspaces.

Place all tests under `tests/`, mirroring the source path from the repository root
(e.g. `apps/api/src/storage/model.ts` → `tests/apps/api/src/storage/model.test.ts`).
Keep test-only fixtures beside their tests. See [testing guidance](docs/guides/testing.md).
