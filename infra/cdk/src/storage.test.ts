import { describe, expect, it } from "vite-plus/test";
import { App, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { Storage } from "./storage.ts";

describe("storage synthesis", () => {
  it("secures state and exposes only scoped policies", () => {
    const stack = new Stack(new App(), "Test");
    const storage = new Storage(stack, "Storage", { environment: "production" });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      DeletionProtectionEnabled: true,
      SSESpecification: { SSEEnabled: true },
      TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
      GlobalSecondaryIndexes: [
        {
          IndexName: "WorkDue",
          KeySchema: [
            { AttributeName: "workPK", KeyType: "HASH" },
            { AttributeName: "workSK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "KEYS_ONLY" },
        },
      ],
    });
    template.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      },
    });
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Deny",
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          }),
        ]),
      },
    });
    expect(storage.tablePolicy(["GetItem"]).toStatementJson().Action).toBe("dynamodb:GetItem");
    expect(storage.workDuePolicy().toStatementJson().Action).toBe("dynamodb:Query");
    expect(() => storage.artifactPolicy("*", "GetObject")).toThrow();
  });
  it("requires explicit disposable Dev and rejects disposable production", () => {
    const stack = new Stack(new App(), "Dev");
    new Storage(stack, "Storage", { environment: "dev", disposable: true });
    Template.fromStack(stack).hasResource("AWS::S3::Bucket", { DeletionPolicy: "Delete" });
    expect(
      () => new Storage(stack, "Invalid", { environment: "production", disposable: true }),
    ).toThrow();
  });
});
