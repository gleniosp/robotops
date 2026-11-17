import { Context, Data, Effect, Layer } from "effect";
import { ApiFailure, type Tenant, type UserMembership } from "@robotops/contracts";

export interface Identity {
  readonly sub: string;
}
export class AuthenticationFailure extends Data.TaggedError("AuthenticationFailure") {}
export class RepositoryFailure extends Data.TaggedError("RepositoryFailure") {}
export class IdentityService extends Context.Service<
  IdentityService,
  {
    readonly authenticate: (token: string) => Effect.Effect<Identity, AuthenticationFailure>;
  }
>()("robotops/IdentityService") {}
export class MembershipRepository extends Context.Service<
  MembershipRepository,
  {
    readonly tenant: (id: string) => Effect.Effect<Tenant | undefined, RepositoryFailure>;
    readonly membership: (
      sub: string,
      tenantId: string,
    ) => Effect.Effect<UserMembership | undefined, RepositoryFailure>;
  }
>()("robotops/MembershipRepository") {}

export type Action =
  | "registerRobot"
  | "listRobots"
  | "readRobot"
  | "submitSimulation"
  | "readRun"
  | "downloadTelemetry";
export type ResourceKind = "robot" | "run";
export interface OwnedResource {
  readonly kind: ResourceKind;
  readonly tenantId: string;
}
export interface AuthorizationRequest {
  readonly token: string;
  readonly tenantId: string;
  readonly action: Action;
  readonly requestId: string;
}
export interface AuthorizedWorkspace {
  readonly sub: string;
  readonly tenantId: string;
  readonly role: UserMembership["role"];
}

// Kept alongside the policy so every R1 route has an explicit capability.
export const routeActions = {
  "POST /v1/robots": "registerRobot",
  "GET /v1/robots": "listRobots",
  "GET /v1/robots/{robotId}": "readRobot",
  "POST /v1/simulations": "submitSimulation",
  "GET /v1/simulations/{runId}": "readRun",
  "GET /v1/simulations/{runId}/artifacts/telemetry": "downloadTelemetry",
} as const satisfies Record<string, Action>;
const resourceKinds: Record<Action, ResourceKind | undefined> = {
  registerRobot: undefined,
  listRobots: undefined,
  readRobot: "robot",
  submitSimulation: "robot",
  readRun: "run",
  downloadTelemetry: "run",
};
const capabilities: Record<UserMembership["role"], readonly Action[]> = {
  admin: Object.values(routeActions),
  engineer: Object.values(routeActions),
  viewer: ["listRobots", "readRobot", "readRun", "downloadTelemetry"],
};
export class AuthorizationService extends Context.Service<
  AuthorizationService,
  {
    readonly workspace: (
      request: AuthorizationRequest,
    ) => Effect.Effect<AuthorizedWorkspace, ApiFailure>;
    readonly resource: (
      request: AuthorizationRequest,
      workspace: AuthorizedWorkspace,
      resource: OwnedResource | undefined,
    ) => Effect.Effect<void, ApiFailure>;
  }
>()("robotops/AuthorizationService") {}

export const authorizationLayer = Layer.effect(
  AuthorizationService,
  Effect.gen(function* () {
    const identity = yield* IdentityService;
    const repository = yield* MembershipRepository;
    return {
      workspace: (request: AuthorizationRequest) =>
        Effect.gen(function* () {
          const fail = (code: ApiFailure["code"]) =>
            new ApiFailure({ code, requestId: request.requestId });
          const user = yield* identity
            .authenticate(request.token)
            .pipe(Effect.mapError(() => fail("UNAUTHENTICATED")));
          const tenant = yield* repository
            .tenant(request.tenantId)
            .pipe(Effect.mapError(() => fail("UNAVAILABLE")));
          const membership = yield* repository
            .membership(user.sub, request.tenantId)
            .pipe(Effect.mapError(() => fail("UNAVAILABLE")));
          if (
            !tenant ||
            tenant.id !== request.tenantId ||
            tenant.status !== "ACTIVE" ||
            !membership ||
            membership.status !== "ACTIVE" ||
            membership.sub !== user.sub ||
            membership.tenantId !== tenant.id
          ) {
            return yield* Effect.fail(fail("NOT_FOUND"));
          }
          // Unknown roles/actions fail closed even if an adapter violates its types.
          if (
            !Object.hasOwn(capabilities, membership.role) ||
            !capabilities[membership.role].includes(request.action)
          ) {
            return yield* Effect.fail(fail("FORBIDDEN"));
          }
          return { sub: user.sub, tenantId: tenant.id, role: membership.role };
        }),
      resource: (request, workspace, resource) => {
        const kind = Object.hasOwn(resourceKinds, request.action)
          ? resourceKinds[request.action]
          : undefined;
        if (
          workspace.tenantId !== request.tenantId ||
          (kind !== undefined &&
            (!resource || resource.kind !== kind || resource.tenantId !== workspace.tenantId))
        ) {
          return Effect.fail(new ApiFailure({ code: "NOT_FOUND", requestId: request.requestId }));
        }
        return Effect.void;
      },
    };
  }),
);

// Load ownership from a trusted repository only after validating the workspace.
// Keeping the handler behind this wrapper avoids executing it on denied requests.
export const withAuthorization = <A, E, R>(
  request: AuthorizationRequest,
  loadResource: (workspace: AuthorizedWorkspace) => Effect.Effect<OwnedResource | undefined, E, R>,
  handler: (workspace: AuthorizedWorkspace) => Effect.Effect<A, E, R>,
) =>
  Effect.gen(function* () {
    const authorization = yield* AuthorizationService;
    const workspace = yield* authorization.workspace(request);
    const resource = yield* loadResource(workspace);
    yield* authorization.resource(request, workspace, resource);
    return yield* handler(workspace);
  });

export const inMemoryMembershipLayer = (
  tenants: readonly Tenant[],
  memberships: readonly UserMembership[],
) => {
  const tenantSnapshot = tenants.map((tenant) => ({ ...tenant }));
  const membershipSnapshot = memberships.map((membership) => ({ ...membership }));
  return Layer.succeed(MembershipRepository, {
    tenant: (id) =>
      Effect.sync(() => {
        const tenant = tenantSnapshot.find((entry) => entry.id === id);
        return tenant && { ...tenant };
      }),
    membership: (sub, tenantId) =>
      Effect.sync(() => {
        const membership = membershipSnapshot.find(
          (entry) => entry.sub === sub && entry.tenantId === tenantId,
        );
        return membership && { ...membership };
      }),
  });
};
