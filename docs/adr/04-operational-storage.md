# ADR-04: Operational storage and CDK ownership

Status: Accepted; resources synthesize locally, runtime adapters are planned.

## Decision

Use one on-demand DynamoDB table with typed access-pattern keys and a sparse,
four-bucket WorkDue index. Keep bulk telemetry in S3. Strong authorization reads
and conditional base-table updates compensate for eventual index reads. The
[data model](../reference/data-model.md) owns exact keys, limits and concurrency rules.
This avoids application scans at the cost of hot-tenant and fixed-index capacity
risks. Revisit partitioning when measured throttling warrants it.

Storage record version 1 is separate from public schemas. Strict decoding and
preserved fixtures establish an explicit compatibility boundary before adapters
persist data; future migrations require overlapping readers and safe rollback.

## Artifact publication and provenance

Use a private S3 bucket with managed encryption, public access blocking and TLS
enforcement. The accepted publication design uses canonical JSONL, attempt-scoped
immutable objects and versioned manifests carrying byte and normalized hashes.
Only a fenced transaction may publish the winning run pointer. Publication,
signing and orphan cleanup are still planned in #18/#20; infrastructure alone
does not enforce immutable writes. Revisit format when measured dataset/query
requirements justify it. Do not expire objects referenced by live runs.

## Infrastructure ownership

Reusable CDK constructs own resources and scoped IAM fragments. Environment is
explicit; disposable storage is allowed only for Dev. Retention is the default;
production recovery controls remain separately scheduled. Synthesis exercises the
same construct used by assertions without deployment or AWS credentials. CDK
names resources; no second manually maintained naming model is introduced.
Keep packaging in the existing fixture until product stack composition is needed.
