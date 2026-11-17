import { describe, expect, it } from "vite-plus/test";
import { Schema } from "effect";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ApiFailure,
  toErrorEnvelope,
  Configuration,
  DatasetManifest,
  ErrorEnvelope,
  Id,
  IdempotencyKey,
  Pagination,
  PublicSimulationRun,
  RegisterRobot,
  SimulationParameters,
  TelemetrySample,
  Timestamp,
  decode,
  errorStatus,
  relativeTimeMicros,
  routes,
  sampleCount,
} from "../../../../packages/contracts/src/index.ts";

const id = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const configuration = { jointPositionRad: [0, 0, 0, 0, 0, 0] };
const parameters = {
  durationSeconds: 60,
  sampleRateHz: 2,
  seed: 0,
  simulatorVersion: "simulated-arm-v1",
};
const timestamp = "2026-11-16T12:00:00Z";
const artifact = {
  metadata: {
    id,
    schemaVersion: "1",
    byteHash: "a".repeat(64),
    normalizedHash: "b".repeat(64),
    eventCount: 120,
    byteLength: 1000,
  },
  tenantId: id,
  runId: id,
  bucket: "private-telemetry",
  key: "tenant/run/fence/data.jsonl",
};

describe("strict version 1 contracts", () => {
  it("accepts a registration and rejects caller ownership at every nesting level", () => {
    const request = { name: "Arm", model: "simulated-arm-v1", configuration };
    expect(decode(RegisterRobot)(request)).toEqual(request);
    for (const field of ["id", "tenantId", "PK", "status"])
      expect(() => decode(RegisterRobot)({ ...request, [field]: id })).toThrow();
    expect(() =>
      decode(RegisterRobot)({ ...request, configuration: { ...configuration, tenantId: id } }),
    ).toThrow();
    expect(() => decode(Configuration)({ jointPositionRad: [0, 0, 0, 0, 0] })).toThrow();
  });
  it.each(["", "robot-123", "81ARZ3NDEKTSV4RRFFQ69G5FAV", "01ARZ3NDEKTSV4RRFFQ69G5FAI"])(
    "rejects malformed ID %s",
    (value) => expect(() => decode(Id)(value)).toThrow(),
  );
  it.each(["2026-02-30T12:00:00Z", "2026-11-16", "2026-11-16T12:00:00+01:00"])(
    "rejects invalid UTC timestamp %s",
    (value) => expect(() => decode(Timestamp)(value)).toThrow(),
  );
  it("enforces sampling and uint32 boundaries", () => {
    expect(sampleCount(decode(SimulationParameters)(parameters))).toBe(120);
    expect(
      decode(SimulationParameters)({
        ...parameters,
        durationSeconds: 100,
        sampleRateHz: 100,
        seed: 4294967295,
      }),
    ).toBeDefined();
    for (const patch of [
      { durationSeconds: 0 },
      { durationSeconds: 301 },
      { sampleRateHz: 101 },
      { durationSeconds: 300, sampleRateHz: 100 },
      { durationSeconds: 0.1, sampleRateHz: 1 },
      { seed: -1 },
      { seed: 4294967296 },
      { seed: 0.5 },
      { durationSeconds: Infinity },
    ])
      expect(() => decode(SimulationParameters)({ ...parameters, ...patch })).toThrow();
    expect(relativeTimeMicros(119, 2)).toBe(59500000);
    expect(relativeTimeMicros(1, 3)).toBe(333333);
    expect(() => relativeTimeMicros(0, 0)).toThrow();
  });
  it("checks pagination and idempotency input boundaries", () => {
    expect(decode(Pagination)({})).toEqual({});
    for (const limit of [0, 51, 1.5, "20"]) expect(() => decode(Pagination)({ limit })).toThrow();
    expect(decode(Pagination)({ limit: 50, cursor: "opaque_cursor-1" })).toBeDefined();
    expect(() => decode(Pagination)({ cursor: "raw/key" })).toThrow();
    for (const key of ["x".repeat(15), "x".repeat(129), "x".repeat(15) + "\n", "é".repeat(16)])
      expect(() => decode(IdempotencyKey)(key)).toThrow();
    expect(decode(IdempotencyKey)("x".repeat(128))).toHaveLength(128);
  });
  it("round trips telemetry and manifest provenance", () => {
    const sample = {
      schemaVersion: "1",
      runId: id,
      sourceId: id,
      sequence: 119,
      relativeTimeMicros: 59500000,
      measurements: {
        jointPositionRad: [0, 0, 0, 0, 0, 0],
        motorTemperatureC: 30.123456,
        powerW: 10,
      },
    };
    const decoded = decode(TelemetrySample)(sample);
    expect(decode(TelemetrySample)(Schema.encodeSync(TelemetrySample)(decoded))).toEqual(sample);
    expect(() =>
      decode(TelemetrySample)({
        ...sample,
        measurements: { ...sample.measurements, powerW: 1.1234567 },
      }),
    ).toThrow();
    const manifest = {
      schemaVersion: "1",
      artifact,
      sourceId: id,
      producer: { name: "robotops", buildVersion: "git-sha" },
      parameters,
      configuration,
      createdAt: timestamp,
    };
    expect(decode(DatasetManifest)(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
    expect(() =>
      decode(DatasetManifest)({
        ...manifest,
        artifact: { ...artifact, metadata: { ...artifact.metadata, eventCount: 119 } },
      }),
    ).toThrow();
    const { producer: omitted, ...incomplete } = manifest;
    expect(omitted).toBeDefined();
    expect(() => decode(DatasetManifest)(incomplete)).toThrow();
  });
  it("prevents internal metadata and contradictory terminal states in public runs", () => {
    const run = {
      id,
      tenantId: id,
      robotId: id,
      configuration,
      parameters,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "QUEUED",
    };
    expect(decode(PublicSimulationRun)(run)).toEqual(run);
    const failed = {
      ...run,
      status: "FAILED",
      completedAt: timestamp,
      failure: {
        code: "EXECUTION_FAILED",
        message: "Simulation failed.",
        action: "Please contact support with the run ID.",
      },
    };
    expect(decode(PublicSimulationRun)(failed)).toEqual(failed);
    expect(() =>
      decode(PublicSimulationRun)({
        ...failed,
        failure: { code: "EXECUTION_FAILED", message: "Simulation failed." },
      }),
    ).toThrow();
    expect(() => decode(PublicSimulationRun)({ ...run, leaseToken: "secret" })).toThrow();
    expect(() => decode(PublicSimulationRun)({ ...run, status: "SUCCEEDED" })).toThrow();
  });
  it("defines all six routes and stable safe error envelopes", () => {
    expect(routes.map(({ method, path }) => `${method} ${path}`)).toEqual([
      "POST /v1/robots",
      "GET /v1/robots",
      "GET /v1/robots/{robotId}",
      "POST /v1/simulations",
      "GET /v1/simulations/{runId}",
      "GET /v1/simulations/{runId}/artifacts/telemetry",
    ]);
    for (const [code, status] of Object.entries(errorStatus)) {
      expect([400, 401, 403, 404, 409, 429, 503]).toContain(status);
      expect(
        decode(ErrorEnvelope)({
          error: {
            code,
            message: "Safe message",
            action: "Please try again.",
            requestId: "request-1",
            details: ["parameters.seed"],
          },
        }),
      ).toBeDefined();
    }
    expect(() =>
      decode(ErrorEnvelope)({
        error: {
          code: "NOT_FOUND",
          message: "Not found",
          action: "Please check the resource.",
          requestId: "r",
          details: ["s3://secret/key"],
        },
      }),
    ).toThrow();
  });
  it("provides safe user guidance without exposing internal failures", () => {
    for (const code of Object.keys(errorStatus) as Array<keyof typeof errorStatus>) {
      const envelope = toErrorEnvelope(new ApiFailure({ code, requestId: "request-1" }));
      expect(decode(ErrorEnvelope)(envelope)).toEqual(envelope);
      expect(envelope.error.action).toMatch(/^Please /);
    }
    const valid = toErrorEnvelope(new ApiFailure({ code: "UNAVAILABLE", requestId: "r" }));
    expect(() => decode(ErrorEnvelope)({ error: { ...valid.error, action: "" } })).toThrow();
    const { action, ...missingAction } = valid.error;
    expect(action).toContain("request ID");
    expect(() => decode(ErrorEnvelope)({ error: missingAction })).toThrow();
  });

  it("keeps contracts independent of entry points, infrastructure and Node runtime imports", () => {
    const directory = fileURLToPath(
      new URL("../../../../packages/contracts/src/", import.meta.url),
    );
    for (const file of readdirSync(directory).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    )) {
      const imports = [
        ...readFileSync(`${directory}/${file}`, "utf8").matchAll(
          /(?:from\s*|import\s*)["']([^"']+)["']/g,
        ),
      ].map((match) => match[1]);
      for (const source of imports)
        expect(source === "effect" || /^\.\/[a-z-]+\.ts$/.test(source ?? "")).toBe(true);
    }
  });
});
