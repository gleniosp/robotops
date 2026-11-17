# Documentation

Use this folder to understand the project and work on its current capabilities.

Start with [Getting started with RobotOps](guides/getting-started.md) for a
walkthrough of the current project, local setup, and contributing.

For more detail:

- [Storage explained](guides/storage.md): how records, result files and recovery fit together.
- [Testing](guides/testing.md): local and CI validation commands.
- [Schema evolution](guides/schema-evolution.md): change contracts without breaking readers or saved data.
- [Toolchain](reference/toolchain.md): configuration, dependency policy, and compatibility notes.
- [Development toolchain decision](adr/01-development-toolchain.md): why the current tools were chosen.
- [API contracts](reference/api.md), [domain](reference/domain.md), and [telemetry](reference/telemetry.md): shared runtime schemas.
- [Shared contracts decision](adr/02-shared-api-contracts.md): validation and dependency boundaries.
- [Operational storage](reference/data-model.md): keys, consistency, record versions and retention.
- [Storage decision](adr/04-operational-storage.md): DynamoDB, S3 and CDK ownership.
- [Authorization](guides/authorization.md): policy matrix and local identity trust boundary.
- [Glossary](reference/glossary.md): shared terms in alphabetical order.
- [Working agreement](working-agreement.md): how maintainers and agents deliver tasks.
