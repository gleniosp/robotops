import { Effect } from "effect";
import { fixtureLayer, listMatching } from "./boundary.ts";

export const handler = (input: unknown): Promise<readonly string[]> =>
  Effect.runPromise(listMatching(input).pipe(Effect.provide(fixtureLayer)));
