import { generateKeyPairSync, sign } from "node:crypto";
import { expect, test, vi } from "vite-plus/test";
import { Effect } from "effect";
import { IdentityService } from "./authorization.ts";
import { createLocalIdentity, verifyLocalToken } from "./local-identity.ts";

const config = {
  mode: "local",
  host: "127.0.0.1",
  issuer: "http://127.0.0.1:4100",
  audience: "robotops-local",
} as const;
const authenticate = (
  local: Effect.Success<ReturnType<typeof createLocalIdentity>>,
  token: string,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const identity = yield* IdentityService;
      return yield* identity.authenticate(token);
    }).pipe(Effect.provide(local.layer), Effect.result),
  );

test("signed identity contains only subject and expires at five minutes", async () => {
  let time = 1000;
  const local = await Effect.runPromise(createLocalIdentity("local", config, () => time));
  const token = await Effect.runPromise(local.issue("user-a"));
  expect(await authenticate(local, token)).toMatchObject({
    _tag: "Success",
    success: { sub: "user-a" },
  });
  time = 1300;
  expect(await authenticate(local, token)).toMatchObject({ _tag: "Failure" });
  time = 999;
  expect(await authenticate(local, token)).toMatchObject({ _tag: "Failure" });
});
test("rejects tampering, unsigned tokens, malformed input and other issuer keys", async () => {
  const local = await Effect.runPromise(createLocalIdentity("local", config));
  const other = await Effect.runPromise(createLocalIdentity("local", config));
  const token = await Effect.runPromise(other.issue("user-a"));
  for (const invalid of [
    token,
    "",
    "x.y.z",
    "a".repeat(8193),
    `${token.split(".")[0]}.${Buffer.from('{"sub":"admin"}').toString("base64url")}.${token.split(".")[2]}`,
    `${Buffer.from('{"alg":"none"}').toString("base64url")}.e30.`,
  ]) {
    expect(await authenticate(local, invalid)).toMatchObject({ _tag: "Failure" });
  }
});
test("rejects public binding, public issuer and non-local modes", async () => {
  for (const overrides of [
    { host: "0.0.0.0" },
    { host: "example.com" },
    { issuer: "http://example.com" },
    { issuer: "http://localhost.evil" },
    { issuer: "http://user@localhost" },
    { mode: "aws" },
    { mode: "production" },
  ]) {
    const result = await Effect.runPromise(
      createLocalIdentity("local", { ...config, ...overrides }).pipe(Effect.result),
    );
    expect(result._tag).toBe("Failure");
  }
});
test("production and AWS environments reject local keys", async () => {
  try {
    for (const key of [
      "NODE_ENV",
      "AWS_EXECUTION_ENV",
      "AWS_LAMBDA_FUNCTION_NAME",
      "ECS_CONTAINER_METADATA_URI",
      "ECS_CONTAINER_METADATA_URI_V4",
    ]) {
      vi.stubEnv(key, key === "NODE_ENV" ? "production" : "present");
      expect(
        (await Effect.runPromise(createLocalIdentity("local", config).pipe(Effect.result)))._tag,
      ).toBe("Failure");
      vi.unstubAllEnvs();
    }
  } finally {
    vi.unstubAllEnvs();
  }
});

test("verified local identity still requires server-side membership", async () => {
  const { Layer } = await import("effect");
  const { authorizationLayer, inMemoryMembershipLayer, withAuthorization } =
    await import("./authorization.ts");
  const local = await Effect.runPromise(createLocalIdentity("local", config));
  const dependencies = Layer.merge(
    local.layer,
    inMemoryMembershipLayer(
      [{ id: "tenant-a", name: "A", status: "ACTIVE" }],
      [{ sub: "member", tenantId: "tenant-a", role: "viewer", status: "ACTIVE" }],
    ),
  );
  for (const sub of ["member", "outsider"]) {
    const token = await Effect.runPromise(local.issue(sub));
    const result = await Effect.runPromise(
      withAuthorization(
        { token, tenantId: "tenant-a", action: "listRobots", requestId: "request-1" },
        () => Effect.succeed(undefined),
        () => Effect.succeed("authorized"),
      ).pipe(
        Effect.provide(authorizationLayer.pipe(Layer.provide(dependencies))),
        Effect.catchTag("ApiFailure", (failure) => Effect.succeed(failure.code)),
      ),
    );
    expect(result).toBe(sub === "member" ? "authorized" : "NOT_FOUND");
  }
});

test("explicit AWS deployment rejects local identity independently of runtime detection", async () => {
  expect(
    (await Effect.runPromise(createLocalIdentity("aws", config).pipe(Effect.result)))._tag,
  ).toBe("Failure");
});

test("local configuration rejects missing, mistyped and unexpected settings", async () => {
  for (const invalid of [
    undefined,
    null,
    {},
    { ...config, audience: 123 },
    { ...config, audience: "" },
    { ...config, privateKey: "untrusted" },
    { ...config, endpoint: "http://localhost" },
  ]) {
    expect(
      (await Effect.runPromise(createLocalIdentity("local", invalid).pipe(Effect.result)))._tag,
    ).toBe("Failure");
  }
});

const validClaims = {
  iss: config.issuer,
  aud: config.audience,
  sub: "user-a",
  iat: 1000,
  exp: 1300,
};
const claimCases: readonly [string, unknown][] = [
  ["wrong issuer", { ...validClaims, iss: "http://127.0.0.1:9999" }],
  ["wrong audience", { ...validClaims, aud: "another-api" }],
  ["missing subject", { iss: config.issuer, aud: config.audience, iat: 1000, exp: 1300 }],
  ["empty subject", { ...validClaims, sub: "" }],
  ["future issue time", { ...validClaims, iat: 1101 }],
  ["expired token", { ...validClaims, exp: 1100 }],
  ["expiry before issue time", { ...validClaims, iat: 1001, exp: 1000 }],
  ["zero lifetime", { ...validClaims, exp: 1000 }],
  ["excessive lifetime", { ...validClaims, exp: 1301 }],
  ["fractional timestamp", { ...validClaims, iat: 1000.5 }],
  ["timestamp string", { ...validClaims, exp: "1300" }],
  ["unexpected role", { ...validClaims, role: "admin" }],
  ["unexpected not-before claim", { ...validClaims, nbf: 1200 }],
];
for (const [name, claims] of claimCases) {
  test(`rejects correctly signed claims: ${name}`, async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = (payload: unknown) => {
      const input = `${encode({ alg: "EdDSA", typ: "JWT" })}.${encode(payload)}`;
      return `${input}.${sign(null, Buffer.from(input), privateKey).toString("base64url")}`;
    };
    // A valid token signed by the same key proves rejection is caused by claims.
    const accepted = await Effect.runPromise(
      verifyLocalToken(token(validClaims), publicKey, config, () => 1100),
    );
    expect(accepted).toEqual({ sub: "user-a" });
    const rejected = await Effect.runPromise(
      verifyLocalToken(token(claims), publicKey, config, () => 1100).pipe(Effect.result),
    );
    expect(rejected).toMatchObject({ _tag: "Failure", failure: { _tag: "AuthenticationFailure" } });
  });
}
