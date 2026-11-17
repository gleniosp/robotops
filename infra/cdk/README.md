# CDK packaging

`synth.ts` packages the API example as a Node Lambda and writes an assembly into
`.toolchain-out/`. It does not deploy infrastructure. Its TypeScript configuration
retains the CDK exception described in [ADR-01](../../docs/adr/01-development-toolchain.md).

See [checks](../../docs/guides/testing.md) for synthesis and runtime validation.

`src/storage.ts` owns reusable DynamoDB/S3 resources and scoped IAM helpers.
The fixture synthesizes explicit disposable Dev storage alongside its Lambda.
See the [data model](../../docs/reference/data-model.md) for keys and lifecycle rules.
