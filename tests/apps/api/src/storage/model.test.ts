import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import {
  decodeRecord,
  keys,
  UnsupportedRecordVersion,
  workDue,
} from "../../../../../apps/api/src/storage/model.ts";
const tenant = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const run = "01ARZ3NDEKTSV4RRFFQ69G5FAW";
describe("storage boundaries", () => {
  it("keeps tenant and record namespaces distinct", () => {
    expect(keys.robot(tenant, run)).toEqual({ PK: `TENANT#${tenant}`, SK: `ROBOT#${run}` });
    expect(keys.run(tenant, run).SK).toBe(`RUN#${run}`);
    expect(keys.dispatch(run)).toEqual({ PK: `DISPATCH#${run}`, SK: "META" });
    expect(keys.membership("subject#tenant", tenant).PK).toBe("USER#subject#tenant");
    expect(() => keys.tenant("x#META")).toThrow();
  });
  it("hashes unambiguous idempotency scopes and rejects invalid keys", () => {
    const a = keys.idempotency(tenant, "a", "POST /v1/simulations", "abcdefghijklmnop");
    expect(a.PK).toMatch(/^IDEMP#[a-f0-9]{64}$/);
    expect(a).not.toEqual(keys.idempotency(run, "a", "POST /v1/simulations", "abcdefghijklmnop"));
    expect(a).not.toEqual(
      keys.idempotency(tenant, "b", "POST /v1/simulations", "abcdefghijklmnop"),
    );
    expect(() => keys.idempotency(tenant, "a", "POST /v1/simulations", "short")).toThrow();
  });
  it("orders canonical due timestamps and uses a stable four-bucket hash", () => {
    const a = workDue(run, "2026-11-17T00:00:00Z");
    expect(a.workPK).toBe("WORK#3");
    expect(a.workSK).toBe("1794873600000#01ARZ3NDEKTSV4RRFFQ69G5FAW");
    expect(() => workDue(run, "1969-12-31T23:59:59Z")).toThrow();
    expect(a).toEqual(workDue(run, "2026-11-17T00:00:00.000Z"));
    expect(a.workSK < workDue(run, "2026-11-17T00:00:01Z").workSK).toBe(true);
  });
  it("reads preserved v1 bytes and rejects unsupported or malformed records", () => {
    const fixture: unknown = JSON.parse(
      readFileSync(new URL("./fixtures/tenant-v1.json", import.meta.url), "utf8"),
    );
    expect(decodeRecord(fixture).kind).toBe("tenant");
    const records: unknown = JSON.parse(
      readFileSync(new URL("./fixtures/records-v1.json", import.meta.url), "utf8"),
    );
    if (!Array.isArray(records)) throw new Error("Invalid fixture collection");
    expect(records.map((record: unknown) => decodeRecord(record).kind)).toEqual([
      "membership",
      "robot",
      "run",
      "dispatch",
      "idempotency",
    ]);
    expect(() => decodeRecord({ recordVersion: "2" })).toThrow(UnsupportedRecordVersion);
    expect(() => decodeRecord({ kind: "tenant" })).toThrow();
    expect(() =>
      decodeRecord({ recordVersion: "1", kind: "tenant", data: {}, PK: "forged" }),
    ).toThrow();
  });
});
