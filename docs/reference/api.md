# R1 API contracts

These are executable shared schemas; HTTP handlers and deployed routes remain
planned. [Domain conventions](domain.md) apply. All six routes require a verified
bearer access token and `X-Tenant-Id`; this header selects a workspace and grants
no permission. Header names in schema objects are canonical spellings; transports
must normalize HTTP's case-insensitive headers and extract relevant values before
strict validation. Request bodies reject all unknown fields, including ownership.

| Method and path                                 | Input schema      | Response schema     | Status |
| ----------------------------------------------- | ----------------- | ------------------- | ------ |
| POST /v1/robots                                 | RegisterRobot     | Robot               | 201    |
| GET /v1/robots                                  | Pagination query  | RobotPage           | 200    |
| GET /v1/robots/{robotId}                        | Id path parameter | Robot               | 200    |
| POST /v1/simulations                            | SubmitSimulation  | AcceptedSimulation  | 202    |
| GET /v1/simulations/{runId}                     | Id path parameter | PublicSimulationRun | 200    |
| GET /v1/simulations/{runId}/artifacts/telemetry | Id path parameter | TelemetryDownload   | 200    |

Registration takes name, model and configuration. Submission takes robotId and
`parameters: {durationSeconds, sampleRateHz, seed, simulatorVersion}`. The nested
parameters object is also used by stored runs and manifests. Creation responses
must include Location pointing to the created resource. Submission returns runId
and requires `Idempotency-Key`: 16–128 printable ASCII characters. Replays are scoped
to tenant, verified subject, route and key for 24 hours: identical semantic input
returns the original 202 response, changed input returns 409. Reauthorize replays.
A durable commit returns 202 even if immediate dispatch fails.

Pagination defaults to 20, accepts integer limits 1–50, and returns items plus an
optional nextCursor. HTTP adapters must parse numeric query strings before schema
validation. Cursor strings are opaque base64url tokens of at most 2048 characters;
syntax validation alone is insufficient. The future adapter must authenticate and
bind them to verified user, tenant and query version, reject tampering or mismatched
scope with 400, and never expose raw storage continuation keys. No cursor codec or
history endpoint is implemented here.

Errors use `{error:{code,message,action,requestId,details?}}`. Optional details contain at
most 32 safe field paths, never input values. `ApiFailure` is the typed tagged
application failure; `toErrorEnvelope` supplies safe default message and action text for every code.
The action is a short sentence explaining what the user can do, such as signing
in again or contacting support with the request ID if a failure persists. Services
and SDKs branch on code; action wording can change and never commands an automatic
retry or refresh. A transport may supply more specific approved guidance when it
knows recovery is possible. Never expose raw exceptions, sensitive identifiers or
unverified support links. A terminal run failure should explain its next step in
its safe failure action; it must not advise retrying a permanently failed run.
Use the [schema evolution guide](../guides/schema-evolution.md) when changing this envelope.

| Status | Stable code                                |
| ------ | ------------------------------------------ |
| 400    | INVALID_INPUT                              |
| 401    | UNAUTHENTICATED                            |
| 403    | FORBIDDEN                                  |
| 404    | NOT_FOUND                                  |
| 409    | IDEMPOTENCY_CONFLICT or ARTIFACT_NOT_READY |
| 429    | RATE_LIMITED                               |
| 503    | UNAVAILABLE                                |

Absent and foreign tenants/resources receive the same protected 404. Use 403 only
for a denied action in a known authorized workspace. Responses use Cache-Control:
no-store. Request bodies are capped at 64 KiB before decoding. Downloads contain
an HTTPS URL, expiresAt and public artifact metadata; future signing limits links
to 60 seconds and the winning artifact. Public responses exclude leases and keys.
Authentication, authorization, byte limits, header behavior and link expiry require
transport/service enforcement; schemas alone do not implement them.
