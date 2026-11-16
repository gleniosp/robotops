# CDK packaging

`synth.ts` packages the API example as a Node Lambda and writes an assembly into
`.toolchain-out/`. It does not deploy infrastructure. Its TypeScript configuration
retains the CDK exception described in [ADR-01](../../docs/adr/01-development-toolchain.md).

See [checks](../../docs/guides/testing.md) for synthesis and runtime validation.
