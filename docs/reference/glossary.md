# Glossary

- **Authorization:** checking a verified subject’s active tenant membership, role capability and resource ownership before an operation.
- **Contract:** a runtime schema and inferred type shared across component boundaries.
- **Effect boundary:** input validation and explicit failure handling at the edge of an operation.
- **Layer:** Effect's way to construct and provide service dependencies.
- **MDS:** Minimum Deployable Slice, the first release gate.
- **Record version:** the storage envelope version selecting a supported decoder, independent of API and telemetry versions. See the [data model](data-model.md).
- **Release age:** time since a dependency version was published to the registry.
- **Synthesis:** CDK generation of CloudFormation and assets without deployment.
- **Telemetry:** ordered measurements emitted by a simulation and described by a versioned manifest.
- **Tenant:** a group sharing the platform whose resources are separated from other groups and accessible through membership.
- **WorkDue:** a sparse, four-bucket DynamoDB index used to locate nonterminal dispatch records due for recovery; candidates require authoritative base-table revalidation.
