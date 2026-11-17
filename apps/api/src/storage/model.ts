import { createHash } from "node:crypto";
import { Schema } from "effect";
import {
  Id,
  Subject,
  Tenant,
  UserMembership,
  Robot,
  SimulationRun,
  DispatchRecord,
  Hash,
  Timestamp,
  decode,
} from "@robotops/contracts";

const id = decode(Id);
const subject = decode(Subject);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const keys = {
  tenant: (tenantId: string) => ({ PK: `TENANT#${id(tenantId)}`, SK: "META" }),
  membership: (sub: string, tenantId: string) => ({
    PK: `USER#${subject(sub)}`,
    SK: `TENANT#${id(tenantId)}`,
  }),
  robot: (tenantId: string, robotId: string) => ({
    PK: `TENANT#${id(tenantId)}`,
    SK: `ROBOT#${id(robotId)}`,
  }),
  run: (tenantId: string, runId: string) => ({
    PK: `TENANT#${id(tenantId)}`,
    SK: `RUN#${id(runId)}`,
  }),
  dispatch: (runId: string) => ({ PK: `DISPATCH#${id(runId)}`, SK: "META" }),
  idempotency: (tenantId: string, sub: string, route: string, key: string) => {
    if (route !== "POST /v1/simulations" || !/^[\x20-\x7e]{16,128}$/.test(key))
      throw new Error("Invalid idempotency scope");
    return {
      PK: `IDEMP#${digest(JSON.stringify([id(tenantId), subject(sub), route, key]))}`,
      SK: "META",
    };
  },
};

export function workDue(runId: string, dueAt: string): { workPK: string; workSK: string } {
  const hash = digest(id(runId));
  const epoch = Date.parse(decode(Timestamp)(dueAt));
  if (epoch < 0) throw new Error("Due time must be at or after the Unix epoch");
  return {
    workPK: `WORK#${Number.parseInt(hash.slice(0, 8), 16) % 4}`,
    workSK: `${String(epoch).padStart(13, "0")}#${runId}`,
  };
}

const envelope = { recordVersion: Schema.Literal("1") };
export const StorageRecord = Schema.Union([
  Schema.Struct({ ...envelope, kind: Schema.Literal("tenant"), data: Tenant }),
  Schema.Struct({ ...envelope, kind: Schema.Literal("membership"), data: UserMembership }),
  Schema.Struct({ ...envelope, kind: Schema.Literal("robot"), data: Robot }),
  Schema.Struct({ ...envelope, kind: Schema.Literal("run"), data: SimulationRun }),
  Schema.Struct({ ...envelope, kind: Schema.Literal("dispatch"), data: DispatchRecord }),
  Schema.Struct({
    ...envelope,
    kind: Schema.Literal("idempotency"),
    data: Schema.Struct({
      tenantId: Id,
      sub: Subject,
      route: Schema.Literal("POST /v1/simulations"),
      fingerprint: Hash,
      runId: Id,
      expiresAt: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
      response: Schema.Struct({ statusCode: Schema.Literal(202), runId: Id }),
    }).check(Schema.makeFilter((value) => value.runId === value.response.runId)),
  }),
]);
export type StorageRecord = typeof StorageRecord.Type;
export class UnsupportedRecordVersion extends Error {
  constructor() {
    super("Unsupported storage record version; deploy a compatible reader before retrying");
  }
}

/** Adapters project physical attributes before decoding; never return raw items to clients. */
export function decodeRecord(input: unknown): StorageRecord {
  if (
    typeof input === "object" &&
    input !== null &&
    "recordVersion" in input &&
    input.recordVersion !== "1"
  ) {
    throw new UnsupportedRecordVersion();
  }
  return decode(StorageRecord)(input);
}
