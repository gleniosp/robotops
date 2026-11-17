import { generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { isIP } from "node:net";
import { Data, Effect, Layer, Schema } from "effect";
import { Subject } from "@robotops/contracts";
import { AuthenticationFailure, IdentityService } from "./authorization.ts";

export class IdentityConfigurationFailure extends Data.TaggedError(
  "IdentityConfigurationFailure",
) {}
const LocalIdentityConfiguration = Schema.Struct({
  mode: Schema.Literal("local"),
  host: Schema.String,
  issuer: Schema.String,
  audience: Schema.String.check(Schema.isMinLength(1)),
});
export type LocalIdentityConfig = typeof LocalIdentityConfiguration.Type;
const isLoopback = (host: string) =>
  host === "localhost" || host === "::1" || (isIP(host) === 4 && host.startsWith("127."));
const isLocalIssuer = (issuer: string) => {
  try {
    const url = new URL(issuer);
    return (
      url.protocol === "http:" &&
      isLoopback(url.hostname.replace(/^\[|\]$/g, "")) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

const Claims = Schema.Struct({
  iss: Schema.String,
  aud: Schema.String,
  sub: Subject,
  iat: Schema.Int,
  exp: Schema.Int,
});
const decodeClaims = Schema.decodeUnknownSync(Claims);
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const header = encode({ alg: "EdDSA", typ: "JWT" });
const MAX_TOKEN_BYTES = 8192;
const TOKEN_LIFETIME_SECONDS = 300;

// Verify against one explicitly trusted local signing key.
export const verifyLocalToken = (
  token: string,
  publicKey: KeyObject,
  config: LocalIdentityConfig,
  now: () => number = () => Math.floor(Date.now() / 1000),
) =>
  Effect.try({
    try: () => {
      if (token.length > MAX_TOKEN_BYTES) throw new AuthenticationFailure();
      const parts = token.split(".");
      const [encodedHeader, payload, signature] = parts;
      if (
        parts.length !== 3 ||
        encodedHeader !== header ||
        !payload ||
        !signature ||
        !/^[A-Za-z0-9_-]+$/.test(payload) ||
        !/^[A-Za-z0-9_-]+$/.test(signature)
      )
        throw new AuthenticationFailure();
      const signatureBytes = Buffer.from(signature, "base64url");
      if (
        signatureBytes.toString("base64url") !== signature ||
        !verify(null, Buffer.from(`${encodedHeader}.${payload}`), publicKey, signatureBytes)
      )
        throw new AuthenticationFailure();
      const claims = decodeClaims(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")), {
        onExcessProperty: "error",
      });
      const time = now();
      if (
        claims.iss !== config.issuer ||
        claims.aud !== config.audience ||
        claims.iat > time ||
        claims.exp <= time ||
        claims.exp <= claims.iat ||
        claims.exp - claims.iat > TOKEN_LIFETIME_SECONDS
      )
        throw new AuthenticationFailure();
      return { sub: claims.sub };
    },
    catch: () => new AuthenticationFailure(),
  });

// No keys are stored on disk or exported. Each local composition gets a new key.
export const createLocalIdentity = (
  deployment: "local" | "aws",
  configuration: unknown,
  now: () => number = () => Math.floor(Date.now() / 1000),
) =>
  Effect.try({
    try: () => {
      if (deployment !== "local") throw new IdentityConfigurationFailure();
      const config = Schema.decodeUnknownSync(LocalIdentityConfiguration)(configuration, {
        onExcessProperty: "error",
      });
      if (
        !isLoopback(config.host) ||
        !isLocalIssuer(config.issuer) ||
        process.env.NODE_ENV === "production" ||
        process.env.AWS_EXECUTION_ENV ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.ECS_CONTAINER_METADATA_URI ||
        process.env.ECS_CONTAINER_METADATA_URI_V4
      ) {
        throw new IdentityConfigurationFailure();
      }
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const service: IdentityService["Service"] = {
        authenticate: (token) => verifyLocalToken(token, publicKey, config, now),
      };
      return {
        layer: Layer.succeed(IdentityService, service),
        issue: (sub: string) =>
          Effect.try({
            try: () => {
              const iat = now();
              const claims = decodeClaims({
                iss: config.issuer,
                aud: config.audience,
                sub,
                iat,
                exp: iat + TOKEN_LIFETIME_SECONDS,
              });
              const input = `${header}.${encode(claims)}`;
              return `${input}.${sign(null, Buffer.from(input), privateKey).toString("base64url")}`;
            },
            catch: () => new AuthenticationFailure(),
          }),
      };
    },
    catch: () => new IdentityConfigurationFailure(),
  });
