import { App, Stack, aws_lambda as lambda } from "aws-cdk-lib";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { mkdirSync, mkdtempSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

mkdirSync(".toolchain-out", { recursive: true });
// A fresh assembly prevents a previous bundle from being selected after a change.
const outdir = mkdtempSync(".toolchain-out/cdk-");
const app = new App({ outdir });
const stack = new Stack(app, "ToolchainFixture", {
  env: { account: "111111111111", region: "eu-central-1" },
});
new NodejsFunction(stack, "Boundary", {
  entry: "tests/toolchain/handler.ts",
  handler: "handler",
  runtime: lambda.Runtime.NODEJS_24_X,
  architecture: lambda.Architecture.X86_64,
  bundling: {
    format: OutputFormat.ESM,
    target: "node24",
    externalModules: [],
    metafile: true,
  },
});
const assembly = app.synth();
const template = assembly.getStackArtifact(stack.artifactId).template;
const resources = template.Resources as Record<
  string,
  { Type: string; Properties: { Runtime?: string } }
>;
const functions = Object.values(resources).filter((r) => r.Type === "AWS::Lambda::Function");
assert.equal(functions.length, 1);
assert.equal(functions[0]?.Properties.Runtime, "nodejs24.x");
mkdirSync(".toolchain-out", { recursive: true });
// Locate CDK's actual bundled asset so the cold import checks CDK packaging.
const assets = readdirSync(outdir).filter((name) => name.startsWith("asset."));
assert.equal(assets.length, 1);
const asset = assets[0];
assert.ok(asset);
copyFileSync(`${outdir}/${asset}/index.mjs`, ".toolchain-out/handler.mjs");
copyFileSync(`${outdir}/${asset}/index.meta.json`, ".toolchain-out/metafile.json");
writeFileSync(".toolchain-out/template.json", JSON.stringify(template, null, 2));
