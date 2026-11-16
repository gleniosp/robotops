# Change a schema safely

A schema describes the data that one part of RobotOps sends to another. Changing
it can break a client or make an older saved dataset unreadable, even when the
TypeScript compiler passes. Use this guide whenever a shared schema changes.

Today the API uses `/v1`, and telemetry samples, artifact metadata and manifests
use `schemaVersion: "1"`. Only these initial schemas exist. There are no migration
runners, older-version readers or deployed product consumers yet.

## Decide who needs to keep working

Before editing a schema, list its producers and readers: API, SDK, browser,
worker and stored records or datasets. Ask whether old readers must accept new
data and whether new readers must accept old data. Record the answer in the
owning issue or PR. A shared package update alone does not update an already
installed client or saved file.

Our current `decode` helper rejects unknown fields. That protects request ownership
and catches internal fields accidentally included in public responses. It also
means an older response reader rejects a newly added field. Optional does not
mean compatible in both directions.

| Change                                                          | Effect with today's strict schemas                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Add an optional request field                                   | New server accepts old requests; old server rejects requests using the field.        |
| Add an optional response field                                  | New reader accepts old responses; old reader rejects responses containing the field. |
| Add a required field                                            | Old data is rejected by the new reader unless explicitly migrated.                   |
| Rename/remove a field, change its type or units, tighten bounds | Can break existing readers or reject formerly valid data.                            |
| Add an enum value                                               | Old readers reject the new value.                                                    |
| Change message/action wording                                   | Compatible; programs must use the stable error code.                                 |

## Choose how to introduce the change

Before the first release, all consumers may be updated together in a single
reviewed change. State that this changes an unreleased contract. Do not claim
backward compatibility merely because the tests for the newest schema pass.

After release, preserve the published contract. If a change would break a reader,
introduce a new API version such as `/v2` or a new telemetry/manifest schema version,
keep the old version available for its agreed support period, and document how
consumers move to the new version. API versions, telemetry versions and simulator
versions describe different contracts; changing one does not automatically change
the others. Simulator behavior changes need a distinct simulator version so old
runs remain reproducible.

A future decision may permit selected response readers to ignore unknown fields.
That requires an explicit policy and compatibility tests before calling response
additions safe. Keep request ownership checks strict and explicitly project public
responses so storage keys and leases cannot escape.

## Keep saved data readable

Never silently reinterpret an existing telemetry version or rewrite historical
artifacts in place. A reader must inspect schemaVersion and select a supported
schema; unknown versions produce a controlled unsupported-version error. Preserve
original bytes, hashes and provenance. If conversion is needed, create a new
artifact and record its source and conversion version.

Storage adapters must define a record version before persisting evolving domain
records. They own explicit migration or version-specific decoding; public domain
schemas alone are not a storage migration strategy. Keep old and new readers
compatible during deployments where API and worker versions overlap. Define rollout
and rollback order before applying a migration; destructive migrations need a
separate reviewed plan.

## Finish the change

Every schema-changing issue and PR must describe the compatibility decision,
versioning or migration approach, rollout/rollback needs and affected consumers.
Test old payloads with new readers and new payloads with supported old readers,
including expected rejection. Keep representative historical fixtures for every
supported persisted version. Add negative cases for ownership, malformed data and
unsupported versions. Update the canonical reference and ADR when the decision
changes. The [working agreement](../working-agreement.md) governs delivery.
