# Use authorization in local tests

The API workspace provides Effect services for identity, membership lookup and
central authorization in `apps/api/src/authorization.ts`. HTTP product handlers
remain planned. The toolchain packaging fixture is not a product route.

Use `withAuthorization` for each protected operation. It authenticates first,
loads the selected tenant and current server-side membership, and checks the
capability before loading resource ownership and calling the handler. Supply
ownership from a trusted repository, never from request bodies or token claims.
Registration and listing use the workspace itself; listing adapters must query
only that workspace. Submission must load its robot, and run reads and downloads
must load their run. Future download adapters must also constrain the artifact to
that run. Authorization does not yet implement storage queries or HTTP routing.

| Route                                           | Action            | Resource  | Admin / engineer | Viewer |
| ----------------------------------------------- | ----------------- | --------- | ---------------- | ------ |
| POST /v1/robots                                 | registerRobot     | Workspace | Allow            | Deny   |
| GET /v1/robots                                  | listRobots        | Workspace | Allow            | Allow  |
| GET /v1/robots/{robotId}                        | readRobot         | Robot     | Allow            | Allow  |
| POST /v1/simulations                            | submitSimulation  | Robot     | Allow            | Deny   |
| GET /v1/simulations/{runId}                     | readRun           | Run       | Allow            | Allow  |
| GET /v1/simulations/{runId}/artifacts/telemetry | downloadTelemetry | Run       | Allow            | Allow  |

A verified subject needs an ACTIVE tenant and ACTIVE membership with the same
subject and tenant IDs. Missing, disabled, revoked and foreign workspaces return
NOT_FOUND. Missing and foreign resources return the identical NOT_FOUND envelope.
Role denial returns FORBIDDEN only after workspace access is established.
Authentication failures return UNAUTHENTICATED; repository failures return
UNAVAILABLE. Transport adapters must use the shared safe error envelope and
no-store headers described in the [API reference](../reference/api.md).

## Try local identity and authorization

The local issuer creates a temporary signed identity token so you can test access
without Cognito or AWS. A token says which user is making a request. Its signature
proves the identity has not been changed; it does not grant a role or workspace
access. Signing keys exist only in memory, and tokens expire after five minutes.

1. Create a local identity with `createLocalIdentity("local", config)`, using mode `local`, a
   loopback host such as `127.0.0.1`, issuer `http://127.0.0.1:4100` and audience
   `robotops-local`. Run the returned Effect to obtain the issuer and identity layer.
2. Call `issue(subject)` and run that Effect to obtain a token for your test user.
3. Build `inMemoryMembershipLayer` with an ACTIVE tenant and an ACTIVE membership
   linking that subject to the tenant and a role.
4. Merge the identity and membership layers, then provide them to
   `authorizationLayer`. Provide the resulting layer to `withAuthorization`.
5. Pass the token, selected tenant ID, action and request ID to the wrapper.
   Supply a trusted resource loader and the operation to execute after approval.

The integration test named “verified local identity still requires server-side
membership” in `tests/apps/api/src/local-identity.test.ts` is a complete runnable example.
Run `pnpm test` from the repository root: the member can list robots, while a
signed token for an outsider receives NOT_FOUND. A viewer attempting registration
receives FORBIDDEN. Tampered or expired tokens receive UNAUTHENTICATED.

## Local identity trust boundary

`createLocalIdentity` in `apps/api/src/local-identity.ts` creates ephemeral Ed25519
keys and an injectable IdentityService layer. Call `issue(subject)` to obtain a
five-minute JWT for local tests; only the verified subject enters authorization.
Memberships and roles always come from the server repository. No private key is
exported or persisted. Restarting invalidates previously issued tokens.

Configuration requires mode `local`, a loopback bind host and an HTTP loopback
issuer URL, plus an audience. Bind any future local listener to that exact host.
The factory requires an explicit deployment argument. Passing `"aws"` rejects local
identity before reading its configuration or creating keys, even without AWS
environment variables. Configuration is decoded strictly: unknown fields, missing
settings and incorrect types fail at startup. The factory also rejects production
NODE_ENV, Lambda and ECS execution environments,
public hosts and non-local modes. The verifier fixes the algorithm and header,
checks the signature, issuer, audience, subject, issue time, expiry and maximum
lifetime, and bounds token size. It rejects extra claims. Do not expose the
issuer through a proxy or use it for cloud authentication. There is no issuer
HTTP server or real Cognito verifier in this implementation. The later AWS
composition must inject a real Cognito IdentityService and never select local
identity. Environment checks are startup safeguards, not a network sandbox.

The in-memory repository takes snapshots of its input and returns copies. Tests
can compose it with local identity and `authorizationLayer`; no AWS credentials
or network calls are needed. Run `pnpm test` from the repository root. See the
[decision](../adr/03-central-authorization.md) for the service boundary rationale.
