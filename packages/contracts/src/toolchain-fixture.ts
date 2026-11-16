import { Schema } from "effect";

// Build-pipeline fixture; replaced once a product slice covers this integration.
const Request = Schema.Struct({ prefix: Schema.String });
export const BucketRequest = { decode: Schema.decodeUnknownEffect(Request) };
