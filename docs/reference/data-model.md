# Operational storage

The CDK [Storage construct](../../infra/cdk/src/storage.ts) synthesizes one on-demand,
encrypted DynamoDB table and a private, TLS-only encrypted S3 bucket. Nothing is
deployed by synthesis. Runtime repositories, submission transactions and artifact
publication remain planned. [Key builders and versioned records](../../apps/api/src/storage/model.ts)
provide the adapter boundary for those implementations.

## Keys and reads

Trusted adapters derive keys from validated identifiers and authorized context.
Tenant selection alone never authorizes a read. Strongly read active tenant and
membership on every protected request; do not cache authorization.

| Record            | PK                | SK                | Read                                            |
| ----------------- | ----------------- | ----------------- | ----------------------------------------------- |
| Tenant            | `TENANT#tenantId` | `META`            | Strong GetItem                                  |
| Membership        | `USER#sub`        | `TENANT#tenantId` | Strong GetItem; user-prefix Query for discovery |
| Robot             | `TENANT#tenantId` | `ROBOT#robotId`   | GetItem; Query begins_with(SK, `ROBOT#`)        |
| Run               | `TENANT#tenantId` | `RUN#runId`       | GetItem; reverse Query begins_with(SK, `RUN#`)  |
| Idempotency       | `IDEMP#digest`    | `META`            | Strong GetItem                                  |
| Dispatch/watchdog | `DISPATCH#runId`  | `META`            | Strong GetItem                                  |

Idempotency digest is SHA-256 of UTF-8 JSON.stringify([tenantId, verified sub,
`POST /v1/simulations`, key]); tuple encoding prevents ambiguous concatenation.
The key is 16–128 printable ASCII characters. The future adapter stores the
canonical request fingerprint and original 202 response. Replay requires fresh
authorization; an unequal fingerprint returns 409. Application expiry is 24 hours;
`expiresAt` is integer Unix seconds and DynamoDB TTL is only eventual cleanup.
Adapters copy this value from the envelope data to the top-level TTL attribute;
other record kinds must omit that physical attribute.

Lists default to 20, maximum 50. Query with Limit and ExclusiveStartKey; stop at
the requested page even when DynamoDB returns less than 1 MiB. Future cursors
must bind verified user, tenant, prefix and query version and reject foreign scope.
ULID sort order is deterministic within a partition, not a global clock guarantee.
No application operation uses Scan.

## Due work and atomic writes

Only nonterminal dispatch records carry `workPK` and `workSK`. `WorkDue` projects
base keys only: `workPK = WORK#bucket`, with bucket equal to the first eight hex
digits of SHA-256(runId), interpreted as an unsigned integer, modulo four.
`workSK` is a 13-digit nonnegative Unix millisecond timestamp followed by `#runId`.
Query each bucket with `workPK = :bucket AND workSK <= :cutoff`, where cutoff is
`13-digit-now#~`. Bound each page and the total sweep; continue with LastEvaluatedKey.
GSI reads are eventual: strongly fetch the base dispatch and run, then conditionally
claim only still-due work. Stale index entries confer no execution authority.

Planned submission uses TransactWriteItems: condition-check active robot, create
run, create/conditionally replace expired idempotency, and create dispatch. Use
attribute_not_exists(PK) on creates; expiry replacement compares the old expiry
and fingerprint to avoid racing another writer. Re-read idempotency strongly after
an ambiguous commit; bound retries with backoff. DynamoDB transactions allow at
most 100 distinct items and 4 MiB total; never target one item twice.

Worker updates require matching status, fence and lease token. Finalization
atomically writes the result pointer and deletes dispatch, removing due-index
attributes. These adapters and concurrency tests belong to later issues.

Keep each encoded item below 64 KiB, including attribute names and physical keys
(DynamoDB's hard ceiling is 400 KiB). Telemetry and manifests belong in S3.
Large tenants and four global index buckets can become hot; measure throttling
before changing partitioning. Base reads can be strong; GSI reads cannot.

## Versions, retention and access

Storage envelopes use `recordVersion: "1"`, independent of public API and telemetry
versions. Adapters project physical attributes, strictly decode the envelope, and
verify its ownership and physical keys against authorized scope. Unknown versions
raise UnsupportedRecordVersion; malformed/missing versions fail validation.
Never reinterpret them as v1 or overwrite them. The preserved v1 fixtures for all six record kinds
check the initial reader; no older persisted version or migration exists yet.
API and worker adapters will consume this boundary. Public schemas are unchanged.

For the next version, deploy readers supporting old and new records first, then
writers. Preserve historical fixtures for every record kind in use. Roll back
writers before readers; retain support for already written versions. A reader-only
rollback that cannot understand stored data is forbidden. See [schema evolution](../guides/schema-evolution.md).

Dev destruction is explicit (`disposable: true`); otherwise resources retain data
and protect the table from deletion. An S3 bucket must be emptied explicitly before
destruction; there is no automatic object-deletion handler. Production PITR,
versioning and recovery validation remain #32/#44. No automatic lifecycle rule
expires live artifacts. Finalized dispatch is deleted transactionally; TTL is
only for expired idempotency records. Cleanup must check live references and active
jobs before deleting unreferenced attempt objects older than seven days.

IAM helpers scope table actions, due-index Query and tenant-prefix object access.
Grant each caller only needed operations. DynamoDB transactions authorize their
underlying item actions. Infrastructure IAM does not replace membership policy.
