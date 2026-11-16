import { Context, Data, Effect, Layer } from "effect";
import { BucketRequest } from "@robotops/contracts/toolchain-fixture";
import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

export class StorageFailure extends Data.TaggedError("StorageFailure")<{
  readonly message: string;
}> {}

export class BucketReader extends Context.Service<
  BucketReader,
  {
    readonly read: Effect.Effect<readonly string[], StorageFailure>;
  }
>()("robotops/toolchain/BucketReader") {}

// Direct SDK adapter: exercised with a local transport stub, never AWS credentials.
export const bucketReaderLayer = (client: Pick<S3Client, "send">) =>
  Layer.succeed(BucketReader, {
    read: Effect.tryPromise({
      try: async () => {
        const response = await client.send(new ListBucketsCommand({}));
        return (response.Buckets ?? []).flatMap((bucket) => (bucket.Name ? [bucket.Name] : []));
      },
      catch: () => new StorageFailure({ message: "Storage request failed" }),
    }),
  });

export const listMatching = (input: unknown) =>
  Effect.gen(function* () {
    const request = yield* BucketRequest.decode(input);
    const reader = yield* BucketReader;
    const buckets = yield* reader.read;
    return buckets.filter((name) => name.startsWith(request.prefix));
  });

export const fixtureLayer = Layer.succeed(BucketReader, {
  read: Effect.succeed(["fixture-telemetry", "other"]),
});
