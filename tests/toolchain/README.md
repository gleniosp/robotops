# Toolchain fixture

This fixture checks the development toolchain without introducing a product API.
`boundary.ts` validates input, injects a service, and wraps an AWS SDK request.
Its tests exercise valid input, invalid input, and typed failures without AWS calls.

`cdk/synth.ts` generates a Node24 Lambda bundle locally. `import.ts` invokes that
bundle and checks that development tools are excluded.
