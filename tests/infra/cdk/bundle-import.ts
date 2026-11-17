import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Schema } from "effect";

const bundle: { handler?: unknown } = await import(
  pathToFileURL(resolve(".toolchain-out/handler.mjs")).href
);
assert.equal(typeof bundle.handler, "function");
// The generated bundle exposes this fixture's Promise boundary.
const handler = bundle.handler as (input: unknown) => Promise<unknown>;
assert.deepEqual(await handler({ prefix: "fixture-" }), ["fixture-telemetry"]);
await assert.rejects(handler({ prefix: false }));
const Metafile = Schema.Struct({
  inputs: Schema.Record(Schema.String, Schema.Unknown),
  outputs: Schema.Record(
    Schema.String,
    Schema.Struct({
      imports: Schema.Array(
        Schema.Struct({ path: Schema.String, external: Schema.optional(Schema.Boolean) }),
      ),
    }),
  ),
});
const meta = Schema.decodeUnknownSync(Metafile)(
  JSON.parse(readFileSync(".toolchain-out/metafile.json", "utf8")),
);
assert.ok(Object.keys(meta.inputs).some((path) => path.includes("effect")));
assert.ok(Object.keys(meta.inputs).some((path) => path.includes("@aws-sdk")));
assert.ok(!Object.keys(meta.inputs).some((path) => /vite-plus|vitest|aws-cdk-lib/.test(path)));
for (const output of Object.values(meta.outputs)) {
  // Only Node built-ins may remain external in the deployable fixture.
  assert.ok(output.imports.every((item) => !item.external || item.path.startsWith("node:")));
}
console.log("CDK bundle imported and invoked successfully on", process.version);
