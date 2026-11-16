import { Data, Schema } from "effect";
import { Configuration, Id, Name, SimulationParameters, Timestamp } from "./primitives.ts";
import { PublicArtifact, PublicSimulationRun, Robot } from "./domain.ts";

export const TenantHeaders = Schema.Struct({ "X-Tenant-Id": Id });
export const IdempotencyKey = Schema.String.check(Schema.isPattern(/^[\x20-\x7e]{16,128}$/));
export const SubmissionHeaders = Schema.Struct({
  "X-Tenant-Id": Id,
  "Idempotency-Key": IdempotencyKey,
});
export const Cursor = Schema.String.check(
  Schema.isBetweenLength(1, 2048),
  Schema.isPattern(/^[A-Za-z0-9_-]+$/),
);
export const Pagination = Schema.Struct({
  limit: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 }))),
  cursor: Schema.optionalKey(Cursor),
});
export const DEFAULT_PAGE_LIMIT = 20;
export const RegisterRobot = Schema.Struct({
  name: Name,
  model: Schema.Literal("simulated-arm-v1"),
  configuration: Configuration,
});
export const SubmitSimulation = Schema.Struct({ robotId: Id, parameters: SimulationParameters });
export const RobotPage = Schema.Struct({
  items: Schema.Array(Robot).check(Schema.isMaxLength(50)),
  nextCursor: Schema.optionalKey(Cursor),
});
export const AcceptedSimulation = Schema.Struct({ runId: Id });
export const TelemetryDownload = Schema.Struct({
  url: Schema.String.check(Schema.isPattern(/^https:\/\/[^\s]+$/)),
  expiresAt: Timestamp,
  artifact: PublicArtifact,
});
export const ErrorCode = Schema.Literals([
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "IDEMPOTENCY_CONFLICT",
  "ARTIFACT_NOT_READY",
  "RATE_LIMITED",
  "UNAVAILABLE",
]);
export const errorStatus = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  ARTIFACT_NOT_READY: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
} as const;
export const ErrorEnvelope = Schema.Struct({
  error: Schema.Struct({
    code: ErrorCode,
    message: Schema.String.check(Schema.isBetweenLength(1, 256)),
    action: Schema.String.check(Schema.isBetweenLength(1, 256)),
    requestId: Schema.String.check(Schema.isBetweenLength(1, 128)),
    details: Schema.optionalKey(
      Schema.Array(
        Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*$/)),
      ).check(Schema.isMaxLength(32)),
    ),
  }),
});
export class ApiFailure extends Data.TaggedError("ApiFailure")<{
  readonly code: typeof ErrorCode.Type;
  readonly requestId: string;
}> {}
// User guidance is display text. Programs branch on code, never on action wording.
export const errorGuidance = {
  INVALID_INPUT: {
    message: "The request is invalid.",
    action: "Please check the highlighted fields and try again.",
  },
  UNAUTHENTICATED: { message: "Authentication is required.", action: "Please sign in again." },
  FORBIDDEN: {
    message: "This action is not permitted.",
    action: "Please contact your workspace administrator for access.",
  },
  NOT_FOUND: {
    message: "The requested resource was not found.",
    action: "Please check the selected workspace and resource.",
  },
  IDEMPOTENCY_CONFLICT: {
    message: "This idempotency key was used for a different request.",
    action: "Please use a new idempotency key only if you intend to submit a new simulation.",
  },
  ARTIFACT_NOT_READY: {
    message: "Telemetry is not available for this run.",
    action: "Please check the run status before requesting telemetry again.",
  },
  RATE_LIMITED: { message: "Too many requests.", action: "Please wait before trying again." },
  UNAVAILABLE: {
    message: "The service is temporarily unavailable.",
    action:
      "Please try again later. If the problem continues, contact support with the request ID.",
  },
} as const satisfies Record<
  typeof ErrorCode.Type,
  { readonly message: string; readonly action: string }
>;

export const toErrorEnvelope = (failure: ApiFailure): typeof ErrorEnvelope.Type => ({
  error: {
    code: failure.code,
    requestId: failure.requestId,
    ...errorGuidance[failure.code],
  },
});
export const routes = [
  {
    method: "POST",
    path: "/v1/robots",
    headers: TenantHeaders,
    request: RegisterRobot,
    response: Robot,
    status: 201,
  },
  {
    method: "GET",
    path: "/v1/robots",
    headers: TenantHeaders,
    request: Pagination,
    response: RobotPage,
    status: 200,
  },
  {
    method: "GET",
    path: "/v1/robots/{robotId}",
    headers: TenantHeaders,
    request: Schema.Struct({ robotId: Id }),
    response: Robot,
    status: 200,
  },
  {
    method: "POST",
    path: "/v1/simulations",
    headers: SubmissionHeaders,
    request: SubmitSimulation,
    response: AcceptedSimulation,
    status: 202,
  },
  {
    method: "GET",
    path: "/v1/simulations/{runId}",
    headers: TenantHeaders,
    request: Schema.Struct({ runId: Id }),
    response: PublicSimulationRun,
    status: 200,
  },
  {
    method: "GET",
    path: "/v1/simulations/{runId}/artifacts/telemetry",
    headers: TenantHeaders,
    request: Schema.Struct({ runId: Id }),
    response: TelemetryDownload,
    status: 200,
  },
] as const;
