# ADR-01: Development toolchain

Use the latest Node 24 LTS patch and stable pnpm, declared in package.json.
Contributors may use any environment manager; global Vite+ is optional.
Project-local Vite+ is required so everyone runs the same checks and tests.
Use pnpm workspaces with a shared root vite.config.ts; add packages and overrides
as consumers appear.

Use strict TypeScript and Effect v4 for validated inputs, services, Layers, and
typed errors. Wrap direct AWS SDK calls in Effect adapters. CDK owns Lambda
packaging; development tools stay out of runtime bundles.

Development and the Lambda fixture use Node 24 because AWS lists Node 26 as
preview. Revisit the runtime major when Lambda Node 26 becomes generally available.

CDK declarations reject exactOptionalPropertyTypes, so only the CDK fixture
config disables it. Strict checks remain enabled. The application fixture keeps
it enabled. Recheck this exception when upgrading CDK.

Vite+ reports a Vite peer warning for its aliased core; its bundled test runner
works with the current fixture. Keep the upstream tool pair together on upgrades.
