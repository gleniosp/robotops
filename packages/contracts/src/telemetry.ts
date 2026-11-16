import { Schema } from "effect";
import {
  Configuration,
  Id,
  Name,
  SimulationParameters,
  SixJoints,
  Timestamp,
  Version,
  decode,
} from "./primitives.ts";
import { TelemetryArtifact } from "./domain.ts";

const hasSixDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value * 1e6) &&
  Math.abs(value - Math.round(value * 1e6) / 1e6) <= Number.EPSILON * Math.max(1, Math.abs(value));
const Rounded = Schema.Finite.check(Schema.makeFilter(hasSixDecimalPlaces));
export const TelemetrySample = Schema.Struct({
  schemaVersion: Version,
  runId: Id,
  sourceId: Id,
  sequence: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 9999 })),
  relativeTimeMicros: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 300000000 })),
  measurements: Schema.Struct({
    jointPositionRad: SixJoints.check(
      Schema.makeFilter((values) => values.every(hasSixDecimalPlaces)),
    ),
    motorTemperatureC: Rounded,
    powerW: Rounded.check(Schema.isGreaterThanOrEqualTo(0)),
  }),
});
export const DatasetManifest = Schema.Struct({
  schemaVersion: Version,
  artifact: TelemetryArtifact,
  sourceId: Id,
  producer: Schema.Struct({ name: Name, buildVersion: Name }),
  parameters: SimulationParameters,
  configuration: Configuration,
  createdAt: Timestamp,
}).check(
  Schema.makeFilter(
    (value) =>
      value.artifact.metadata.eventCount ===
      value.parameters.durationSeconds * value.parameters.sampleRateHz,
  ),
);
export const sampleCount = (parameters: typeof SimulationParameters.Type): number =>
  decode(SimulationParameters)(parameters).durationSeconds * parameters.sampleRateHz;
export const relativeTimeMicros = (sequence: number, sampleRateHz: number): number => {
  if (
    !Number.isInteger(sequence) ||
    sequence < 0 ||
    sequence >= 10000 ||
    !Number.isFinite(sampleRateHz) ||
    sampleRateHz <= 0 ||
    sampleRateHz > 100 ||
    sequence / sampleRateHz >= 300
  )
    throw new RangeError("Invalid sample position");
  return Math.round((sequence * 1000000) / sampleRateHz);
};
export type TelemetrySample = typeof TelemetrySample.Type;
export type DatasetManifest = typeof DatasetManifest.Type;
