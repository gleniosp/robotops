import { expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { routes, toErrorEnvelope, type Tenant, type UserMembership } from "@robotops/contracts";
import {
  AuthenticationFailure,
  IdentityService,
  MembershipRepository,
  RepositoryFailure,
  authorizationLayer,
  inMemoryMembershipLayer,
  routeActions,
  withAuthorization,
  type Action,
  type OwnedResource,
} from "../../../../apps/api/src/authorization.ts";

const tenant: Tenant = { id: "tenant-a", name: "A", status: "ACTIVE" };
const membership: UserMembership = {
  sub: "user-a",
  tenantId: tenant.id,
  role: "admin",
  status: "ACTIVE",
};
const identity = Layer.succeed(IdentityService, {
  authenticate: (token) =>
    token === "valid"
      ? Effect.succeed({ sub: "user-a" })
      : Effect.fail(new AuthenticationFailure()),
});
const run = async (
  action: Action,
  options: {
    role?: UserMembership["role"];
    tenants?: readonly Tenant[];
    memberships?: readonly UserMembership[];
    resource?: OwnedResource | undefined;
    token?: string;
    tenantId?: string;
  } = {},
) => {
  let handled = false;
  let loaded = false;
  const repository = inMemoryMembershipLayer(
    options.tenants ?? [tenant],
    options.memberships ?? [{ ...membership, role: options.role ?? "admin" }],
  );
  const resource = Object.hasOwn(options, "resource")
    ? options.resource
    : {
        kind:
          action === "readRun" || action === "downloadTelemetry"
            ? ("run" as const)
            : ("robot" as const),
        tenantId: tenant.id,
      };
  const program = withAuthorization(
    {
      action,
      token: options.token ?? "valid",
      tenantId: options.tenantId ?? tenant.id,
      requestId: "request-1",
    },
    () =>
      Effect.sync(() => {
        loaded = true;
        return resource;
      }),
    () =>
      Effect.sync(() => {
        handled = true;
        return "ok";
      }),
  );
  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(authorizationLayer.pipe(providePolicyDependencies(repository))),
      Effect.catchTag("ApiFailure", (failure) => Effect.succeed(toErrorEnvelope(failure))),
    ),
  );
  return { result, handled, loaded };
};
// Supply the same trusted identity boundary to every policy scenario.
const providePolicyDependencies = (repository: Layer.Layer<MembershipRepository>) =>
  Layer.provide(Layer.merge(identity, repository));
const code = async (action: Action, options: Parameters<typeof run>[1], expected: string) => {
  const outcome = await run(action, options);
  expect(outcome.result).toMatchObject({ error: { code: expected } });
  expect(outcome.handled).toBe(false);
  return outcome;
};

test("every contracted R1 route has a policy", () => {
  expect(Object.keys(routeActions).sort()).toEqual(
    routes.map((route) => `${route.method} ${route.path}`).sort(),
  );
});
for (const role of ["admin", "engineer", "viewer"] as const) {
  for (const action of Object.values(routeActions)) {
    test(`${role}: ${action}`, async () => {
      const denied =
        role === "viewer" && (action === "registerRobot" || action === "submitSimulation");
      if (denied) await code(action, { role }, "FORBIDDEN");
      else expect((await run(action, { role })).result).toBe("ok");
    });
  }
}
for (const action of Object.values(routeActions)) {
  test(`${action} denies missing or inactive trust attributes`, async () => {
    for (const options of [
      { tenants: [] },
      { tenants: [{ ...tenant, status: "DISABLED" as const }] },
      { memberships: [] },
      { memberships: [{ ...membership, status: "REVOKED" as const }] },
      { memberships: [{ ...membership, sub: "other" }] },
      { memberships: [{ ...membership, tenantId: "other" }] },
      { tenantId: "foreign" },
    ]) {
      expect((await code(action, options, "NOT_FOUND")).loaded).toBe(false);
    }
    expect((await code(action, { token: "invalid" }, "UNAUTHENTICATED")).loaded).toBe(false);
  });
}
for (const action of ["readRobot", "submitSimulation", "readRun", "downloadTelemetry"] as const) {
  test(`${action} hides unknown, foreign and wrong-kind resources`, async () => {
    const missing = await code(action, { resource: undefined }, "NOT_FOUND");
    const foreign = await code(
      action,
      {
        resource: {
          kind: action === "readRobot" || action === "submitSimulation" ? "robot" : "run",
          tenantId: "foreign",
        },
      },
      "NOT_FOUND",
    );
    expect(foreign.result).toEqual(missing.result);
    await code(
      action,
      {
        resource: {
          kind: action === "readRobot" || action === "submitSimulation" ? "run" : "robot",
          tenantId: tenant.id,
        },
      },
      "NOT_FOUND",
    );
  });
}
test("repository failure is unavailable and never executes the handler", async () => {
  const repository = Layer.succeed(MembershipRepository, {
    tenant: () => Effect.fail(new RepositoryFailure()),
    membership: () => Effect.succeed(membership),
  });
  const result = await Effect.runPromise(
    withAuthorization(
      { token: "valid", tenantId: tenant.id, action: "registerRobot", requestId: "r" },
      () => Effect.succeed(undefined),
      () => Effect.die("must not run"),
    ).pipe(
      Effect.provide(authorizationLayer.pipe(providePolicyDependencies(repository))),
      Effect.catchTag("ApiFailure", (failure) => Effect.succeed(failure.code)),
    ),
  );
  expect(result).toBe("UNAVAILABLE");
});
