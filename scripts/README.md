# Repository checks

`check-docs.ts` validates local Markdown file targets. See
[testing guidance](../docs/guides/testing.md) for commands and limits.

`check-test-layout.ts` rejects test files outside the mirrored `tests/` tree;
`pnpm run check` runs it alongside the documentation checks.
