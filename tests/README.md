# Tests

Tests mirror the source tree from the repository root. For example,
`apps/api/src/storage/model.ts` is covered by
`tests/apps/api/src/storage/model.test.ts`. Test-only fixtures live beside the tests.

- `apps/`: API boundary, authorization, local identity and storage model tests.
- `packages/`: shared contract validation and dependency boundary tests.
- `infra/`: CDK storage assertions and `infra/cdk/bundle-import.ts`, which invokes
  the generated Lambda bundle and checks its runtime dependencies.
- `scripts/`: documentation and test layout checker tests.

This workspace declares test dependencies without adding them to product packages.
The main test TypeScript configuration is strict; `infra/cdk/tsconfig.json` retains
the scoped CDK compatibility exception from ADR-01.

See [testing guidance](../docs/guides/testing.md) for commands and layout rules.
