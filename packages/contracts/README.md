# Shared contracts

`src/index.ts` exports Effect schemas for R1 entities, API inputs/responses,
telemetry and manifests. Use `decode(schema)(unknownInput)` for strict validation;
use `parseOptions` with Effect decoders when an Effect result is needed. Exported
schema `.Type` members provide inferred TypeScript types.

See the [API](../../docs/reference/api.md), [domain](../../docs/reference/domain.md)
and [telemetry](../../docs/reference/telemetry.md) references and the
[shared contracts decision](../../docs/adr/02-shared-api-contracts.md).
The separate `@robotops/contracts/toolchain-fixture` export supplies BucketRequest
for build-pipeline tests until a product slice replaces that coverage. Services remain planned.
Follow the [schema evolution guide](../../docs/guides/schema-evolution.md) for changes.
Contracts import only Effect and sibling contract modules; boundary tests enforce
this dependency rule. Run validation with the root [checks](../../docs/guides/testing.md).
