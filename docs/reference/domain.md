# Domain contracts

The shared [contracts package](../../packages/contracts/README.md) implements the
version 1 data model using Effect Schema. Services and persistence remain planned.
Use its `decode(schema)` helper at trust boundaries; it rejects excess properties,
including nested ownership fields. Direct Effect decoders strip excess properties
unless passed the exported `parseOptions`. Types are inferred from schemas.

IDs are uppercase ULIDs with a valid 48-bit timestamp prefix. User subjects are
nonempty strings of at most 128 characters. Times are valid RFC3339 UTC strings
with seconds and optional millisecond precision. Names contain 1–80 characters.

- `Tenant`: id, name, ACTIVE/DISABLED status.
- `UserMembership`: sub, tenantId, admin/engineer/viewer role, ACTIVE/REVOKED status.
- `Robot`: id, tenantId, name, model, configuration, status, createdAt.
- `PublicSimulationRun`: id, tenantId, robotId, configuration, parameters and timestamps;
  QUEUED, RUNNING with startedAt, SUCCEEDED with completion and result, or FAILED
  with completion and safe failure (code, message and user-facing action text). Contradictory terminal payloads are rejected.
- `SimulationRun`: internal public projection plus attempt (0–3), fence, optional lease.
- `DispatchRecord`: tenantId, runId, dueAt, sendCount (0–10), recoveryReason and optional lease.
- `TelemetryArtifact`: public metadata plus internal tenant/run and bucket/key.
- `DatasetManifest`: immutable artifact provenance; see [telemetry](telemetry.md).

The `simulated-arm-v1` configuration is `{jointPositionRad: [a,b,c,d,e,f]}`:
six finite initial angles, each within ±π radians. No arbitrary configuration or
telemetry properties are accepted. The simulator version is `simulated-arm-v1`.
Schema versions are the string `"1"`.

Leases and storage keys never appear in public run schemas. Schema validation does
not authorize ownership, validate lifecycle transitions, sign cursors, or implement
persistence. Those behaviors belong to subsequent issues.
