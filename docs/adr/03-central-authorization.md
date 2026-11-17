# ADR-03: Central typed attribute authorization

Status: accepted; service boundary and local identity implemented locally.

## Context

Workspace selection is untrusted input. Token roles can become stale, and
resource ownership must not be inferred from IDs supplied by the caller.

## Decision

Use Effect IdentityService, MembershipRepository and AuthorizationService
boundaries in the API workspace. Centralize the six R1 capabilities and require
active server-side tenant membership on each request. Run ownership checks before
protected handler execution through `withAuthorization`. Keep resource lookup
behind workspace authorization, with typed failures and indistinguishable
missing/foreign resource responses.

Provide an in-memory repository and a loopback-only local signed-token factory
with ephemeral asymmetric keys. No test identity configuration is accepted in
explicit AWS deployment mode, production or detected AWS execution environments.
The local factory takes deployment separately from its strictly decoded settings,
so local configuration cannot override the deployment boundary. Real Cognito verification,
HTTP handlers and deployed composition belong to later issues.

## Consequences

Adapters must supply trustworthy ownership, scope collection queries and map the
shared errors to HTTP. Services can be exercised without AWS while production
identity remains an explicit dependency. Local JWT verification is deliberately
restricted to the factory's own token format; it is not a general JWT library.
See [authorization](../guides/authorization.md) for the policy matrix and
local trust boundary.
