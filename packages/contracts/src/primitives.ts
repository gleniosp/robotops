import { Schema } from "effect";

export const Id = Schema.String.check(Schema.isPattern(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/));
export const Subject = Schema.String.check(Schema.isBetweenLength(1, 128));
export const Name = Schema.String.check(Schema.isBetweenLength(1, 80));
export const Timestamp = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/),
  Schema.makeFilter((value) => {
    const date = new Date(value);
    return (
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19)
    );
  }),
);
export const Hash = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/));
export const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export const Seed = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 4294967295 }));
export const Version = Schema.Literal("1");
export const SimulatorVersion = Schema.Literal("simulated-arm-v1");
export const SixJoints = Schema.Tuple([
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
]);
// Version 1 starts from six joint angles in radians, each within one revolution.
export const Configuration = Schema.Struct({
  jointPositionRad: SixJoints.check(
    Schema.makeFilter((values) => values.every((value) => Math.abs(value) <= Math.PI)),
  ),
});
export const SimulationParameters = Schema.Struct({
  durationSeconds: Schema.Finite.check(Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(300)),
  sampleRateHz: Schema.Finite.check(Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(100)),
  seed: Seed,
  simulatorVersion: SimulatorVersion,
}).check(
  Schema.makeFilter((value) => {
    const count = value.durationSeconds * value.sampleRateHz;
    return Number.isInteger(count) && count >= 1 && count <= 10000;
  }),
);
export const MAX_TELEMETRY_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 64 * 1024;
// Always use these options at trust boundaries: Effect otherwise strips excess keys.
export const parseOptions = { onExcessProperty: "error" } as const;
export const decode = <S extends Schema.ConstraintDecoder<unknown>>(schema: S) =>
  Schema.decodeUnknownSync(schema, parseOptions);
