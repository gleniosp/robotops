# Getting started with RobotOps

RobotOps is being built as a multi-tenant platform: separate groups share the
service while keeping their robots, runs, and telemetry separate. A user's
membership determines which tenant's resources they can access. The first
release focuses on an authenticated API; a web application and SDK come later.

Today, the repository provides the development foundation. You can install its
tools, run checks and tests, and build a small Lambda example locally. Robot
registration, simulations, login, tenant isolation, and cloud deployment are still planned.

## Set up a checkout

Install Git, Node.js, and pnpm first. Use versions matching `engines.node` and
`packageManager` in `package.json`. You can use your existing installation or
runtime manager; global Vite+ is optional. You also need internet access for the
initial downloads. Clone the repository:

```sh
git clone https://github.com/gleniosp/robotops.git
cd robotops
```

If you use [global Vite+](https://viteplus.dev/guide/env), run `vp env install`
inside the checkout to install the declared Node and pnpm versions. Otherwise,
check your existing versions with `node --version` and `pnpm --version`.

Then install the project dependencies:

```sh
pnpm install --frozen-lockfile
```

This installs the required project-local Vite+ along with the other development
dependencies. The project commands use that local copy, so a global Vite+
installation is not required. You do not need an AWS account or Docker for this guide.

## Check that the foundation works

```sh
pnpm run check
pnpm test
```

The first command checks formatting, lint rules, and TypeScript types. It does not
change files. The second runs tests for a small example that validates incoming
data, provides a service to an operation, and handles failures. These are building
blocks for the future API, rather than a running robot service.

If formatting needs attention while you work, run `pnpm run fix`, review the
changes, and run the checks again.

## Build and run the local Lambda example

```sh
pnpm run toolchain:bundle
pnpm run toolchain:import
```

The first command uses AWS CDK to describe a Lambda function and generate its
deployment files. It also bundles the example handler and its dependencies.
The second loads that bundle in Node and calls the handler with sample data. A
successful run prints that the CDK bundle imported and invoked successfully.

Both commands run on your computer. They do not create AWS resources or start a
local AWS emulator. Generated files go into `.toolchain-out/`, which Git ignores.

For the configuration and its current limits, read the
[toolchain reference](../reference/toolchain.md).

## Find a place to contribute

Start with the [open issues](https://github.com/gleniosp/robotops/issues) to see
planned work and dependencies. Search before reporting a bug or proposing a
change. Describe the problem, expected behavior, and a small reproduction where
possible. Discuss substantial changes with the maintainer before implementing
them.

For an agreed task, follow the [working agreement](../working-agreement.md) for
branch names, local review, commits, and pull requests. Include relevant checks
and update the guides when a change affects what someone can do. The maintainer
reviews and merges contributions. A dedicated public contribution guide and PR
checks are planned in [issue #4](https://github.com/gleniosp/robotops/issues/4).

Read the [security policy](../../SECURITY.md) before reporting a vulnerability and
the [code of conduct](../../CODE_OF_CONDUCT.md) for participation expectations.
