import { expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { S3Client } from "@aws-sdk/client-s3";
import {
  BucketReader,
  StorageFailure,
  bucketReaderLayer,
  fixtureLayer,
  listMatching,
} from "../../../../apps/api/src/boundary.ts";

test("decodes input and injects a Layer", async () => {
  await expect(
    Effect.runPromise(listMatching({ prefix: "fixture-" }).pipe(Effect.provide(fixtureLayer))),
  ).resolves.toEqual(["fixture-telemetry"]);
});

test("rejects invalid input before invoking storage", async () => {
  let calls = 0;
  const layer = Layer.succeed(BucketReader, {
    read: Effect.sync(() => {
      calls++;
      return [];
    }),
  });
  const result = await Effect.runPromise(
    listMatching({ prefix: 42 }).pipe(Effect.provide(layer), Effect.result),
  );
  expect(result._tag).toBe("Failure");
  expect(calls).toBe(0);
});

test("maps SDK transport failure to a typed error", async () => {
  const client = new S3Client({
    region: "eu-central-1",
    credentials: { accessKeyId: "fixture", secretAccessKey: "fixture" },
    maxAttempts: 1,
    requestHandler: { handle: () => Promise.reject(new Error("transport unavailable")) },
  });
  try {
    const message = await Effect.runPromise(
      listMatching({ prefix: "" }).pipe(
        Effect.provide(bucketReaderLayer(client)),
        Effect.catchTag("StorageFailure", (error) => Effect.succeed(error.message)),
      ),
    );
    expect(message).toBe("Storage request failed");
  } finally {
    client.destroy();
  }
});

test("typed errors survive service injection", async () => {
  const layer = Layer.succeed(BucketReader, {
    read: Effect.fail(new StorageFailure({ message: "denied" })),
  });
  const result = await Effect.runPromise(
    listMatching({ prefix: "" }).pipe(
      Effect.provide(layer),
      Effect.catchTag("StorageFailure", (error) => Effect.succeed(error.message)),
    ),
  );
  expect(result).toBe("denied");
});
