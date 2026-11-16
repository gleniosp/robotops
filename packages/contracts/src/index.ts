import { Schema } from "effect";

// Toolchain example only; product contracts are owned by issue #5.
const Request = Schema.Struct({ prefix: Schema.String });
export const BucketRequest = { decode: Schema.decodeUnknownEffect(Request) };
