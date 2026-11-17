# API boundary

`src/handler.ts` composes the toolchain example; `src/boundary.ts` validates
shared contracts and injects storage behavior. This is a packaging fixture,
not a deployed product API. Tests cover decoding, service injection, and SDK failures.

See [checks](../../docs/guides/testing.md) for validation and bundle commands.

`src/authorization.ts` supplies identity, membership and authorization services,
plus a wrapper for future protected handlers. `src/local-identity.ts` supplies an
ephemeral local signed-token issuer. See [authorization](../../docs/guides/authorization.md)
for the route matrix, composition requirements and local trust boundary.
