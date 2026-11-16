# ADR-02: Shared API contracts

Status: accepted; schemas implemented locally, services remain planned.

## Context

API, worker and future SDK consumers need one runtime-validated model. Unknown
ownership fields and accidental internal metadata in responses must be rejected.

## Decision

Use Effect Schema in `packages/contracts` with inferred types and the strict
`decode` helper. Keep contracts independent of infrastructure and entry points.
Separate public run unions from internal lease/storage records. Represent expected
API failures with a tagged error and a stable safe envelope. Version routes with
/v1 and telemetry with schemaVersion `"1"`.

Version 1 robot configuration contains six initial joint angles bounded to ±π;
submission nests the reusable simulation parameters object. Manifests embed the
configuration snapshot rather than relying on a mutable external reference.
These concrete wire choices resolve details left open by the planning baseline.

## Consequences

Consumers must use strict parse options; default Effect decoding strips unknown
properties. Schemas prove shapes and local bounds, while authorization, authenticated
cursors, lifecycle transitions, byte limits and generated stream consistency need
service enforcement. Changes follow the [schema evolution guide](../guides/schema-evolution.md).
Strict readers also reject added response fields, so additions require a
compatibility decision. Error envelopes include prose action text for users;
automation relies on stable codes. The build fixture has a separate
`@robotops/contracts/toolchain-fixture` export until product integration tests
replace its build-pipeline coverage. See the [API](../reference/api.md),
[domain](../reference/domain.md) and [telemetry](../reference/telemetry.md) references.
