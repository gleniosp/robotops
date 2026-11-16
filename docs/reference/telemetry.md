# Version 1 telemetry

[Shared schemas](../../packages/contracts/README.md) validate telemetry and manifest
shapes. Generation, canonical serialization, publication and hashing remain planned.

Simulation parameters require duration >0 and ≤300 seconds, rate >0 and ≤100 Hz,
uint32 seed and simulatorVersion `simulated-arm-v1`. Their product must be an exact
integer N from 1 to 10000; no floating point tolerance rounds invalid products.
The `sampleCount` helper validates those bounds. For 60 seconds at 2 Hz, N=120.

Samples contain schemaVersion `"1"`, runId, sourceId (robot ID), sequence 0–9999,
relativeTimeMicros and measurements: six finite jointPositionRad values, finite
motorTemperatureC and finite nonnegative powerW. Measurements have at most six
decimal places. Sequences cover 0 through N−1 and relative time is
`round(sequence * 1000000 / sampleRateHz)`, supplied by `relativeTimeMicros`.
Sequence continuity, run/source consistency and count must be verified across the
stream by the future generator/publication implementation; a sample schema cannot
prove those relationships alone.

Output is bounded to 10 MiB. Public artifact metadata contains id, schemaVersion,
byteHash, normalizedHash, eventCount (1–10000), byteLength (1–10485760). Hashes are
lowercase SHA-256 hexadecimal strings. The result summary contains sampleCount,
min/maxMotorTemperatureC and meanPowerW. Its sampleCount must match eventCount.
The byte hash covers exact downloaded UTF-8 JSONL bytes. The normalized hash excludes
execution-specific run/source IDs and creation timestamps, enabling comparison
between equivalent runs. Future serialization fixes field ordering, six-place
numeric rounding and a trailing newline; output size is enforced while writing.

`DatasetManifest` contains schemaVersion, internal artifact location and ownership,
sourceId, producer name/buildVersion, parameters (including simulator version and
seed), full configuration and createdAt. This embeds a reproducible configuration
snapshot. Its eventCount must equal the sample count derived from its parameters. Internal artifact records remain private; public results omit bucket/key.
Actual hash correctness, provenance matching the authorized run and manifest/object
atomic publication are obligations of the later artifact service.
