import { Schema } from "effect";
import {
  Configuration,
  Count,
  Hash,
  Id,
  MAX_TELEMETRY_BYTES,
  Name,
  SimulationParameters,
  Subject,
  Timestamp,
  Version,
} from "./primitives.ts";

export const Tenant = Schema.Struct({
  id: Id,
  name: Name,
  status: Schema.Literals(["ACTIVE", "DISABLED"]),
});
export const UserMembership = Schema.Struct({
  sub: Subject,
  tenantId: Id,
  role: Schema.Literals(["admin", "engineer", "viewer"]),
  status: Schema.Literals(["ACTIVE", "REVOKED"]),
});
export const Robot = Schema.Struct({
  id: Id,
  tenantId: Id,
  name: Name,
  model: Schema.Literal("simulated-arm-v1"),
  configuration: Configuration,
  status: Schema.Literals(["ACTIVE", "DISABLED"]),
  createdAt: Timestamp,
});
export const SafeFailure = Schema.Struct({
  code: Schema.Literals([
    "INVALID_WORKLOAD",
    "EXECUTION_FAILED",
    "ATTEMPTS_EXHAUSTED",
    "DISPATCH_EXHAUSTED",
    "DEADLINE_EXCEEDED",
  ]),
  message: Name,
  action: Schema.String.check(Schema.isBetweenLength(1, 256)),
});
export const ResultSummary = Schema.Struct({
  sampleCount: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10000 })),
  minMotorTemperatureC: Schema.Finite,
  maxMotorTemperatureC: Schema.Finite,
  meanPowerW: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
}).check(Schema.makeFilter((value) => value.minMotorTemperatureC <= value.maxMotorTemperatureC));
export const PublicArtifact = Schema.Struct({
  id: Id,
  schemaVersion: Version,
  byteHash: Hash,
  normalizedHash: Hash,
  eventCount: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10000 })),
  byteLength: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_TELEMETRY_BYTES })),
});
export const PublicResult = Schema.Struct({
  artifact: PublicArtifact,
  summary: ResultSummary,
}).check(Schema.makeFilter((value) => value.artifact.eventCount === value.summary.sampleCount));
const runFields = {
  id: Id,
  tenantId: Id,
  robotId: Id,
  configuration: Configuration,
  parameters: SimulationParameters,
  createdAt: Timestamp,
  updatedAt: Timestamp,
};
export const PublicSimulationRun = Schema.Union([
  Schema.Struct({ ...runFields, status: Schema.Literal("QUEUED") }),
  Schema.Struct({ ...runFields, status: Schema.Literal("RUNNING"), startedAt: Timestamp }),
  Schema.Struct({
    ...runFields,
    status: Schema.Literal("SUCCEEDED"),
    startedAt: Timestamp,
    completedAt: Timestamp,
    result: PublicResult,
  }),
  Schema.Struct({
    ...runFields,
    status: Schema.Literal("FAILED"),
    startedAt: Schema.optionalKey(Timestamp),
    completedAt: Timestamp,
    failure: SafeFailure,
  }),
]);
export const SimulationRun = Schema.Struct({
  public: PublicSimulationRun,
  attempt: Count.check(Schema.isLessThanOrEqualTo(3)),
  fence: Count,
  lease: Schema.optionalKey(
    Schema.Struct({
      token: Schema.String.check(Schema.isBetweenLength(1, 128)),
      expiresAt: Timestamp,
    }),
  ),
});
export const DispatchRecord = Schema.Struct({
  tenantId: Id,
  runId: Id,
  dueAt: Timestamp,
  sendCount: Count.check(Schema.isLessThanOrEqualTo(10)),
  recoveryReason: Schema.Literals(["INITIAL", "WATCHDOG", "LEASE_EXPIRED", "SEND_FAILED"]),
  lease: Schema.optionalKey(
    Schema.Struct({
      token: Schema.String.check(Schema.isBetweenLength(1, 128)),
      expiresAt: Timestamp,
    }),
  ),
});
export const TelemetryArtifact = Schema.Struct({
  metadata: PublicArtifact,
  tenantId: Id,
  runId: Id,
  bucket: Schema.String.check(Schema.isBetweenLength(3, 63)),
  key: Schema.String.check(Schema.isBetweenLength(1, 1024)),
});
export type Tenant = typeof Tenant.Type;
export type UserMembership = typeof UserMembership.Type;
export type Robot = typeof Robot.Type;
export type SimulationRun = typeof SimulationRun.Type;
export type DispatchRecord = typeof DispatchRecord.Type;
export type TelemetryArtifact = typeof TelemetryArtifact.Type;
