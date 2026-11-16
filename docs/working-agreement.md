# Working agreement

Issues own task scope, priority, dependencies, and acceptance criteria. Milestones
own release gates. Repository documentation describes current capabilities and
accepted designs; planned behavior must be clearly identified. Maintainer
instructions take precedence within repository policy.

## Select and implement a task

Read live issues, milestone criteria, native blockers, and related PRs. Prefer
the earliest active release milestone, then priority and issue number. Future
architecture work requires explicit activation. Confirm prerequisites have
reached the default branch; local code and unmerged PRs do not prove delivery.

Propose an issue and a branch such as `build/3-viteplus-effect-toolchain`. Use the
maintainer's branch, or create/switch it when instructed. Inspect staged,
unstaged, and untracked work before editing. Preserve unrelated changes.

Normally one issue and PR deliver one independently reviewable behavior. Read
its contracts and applicable AGENTS instructions, implement its agreed scope,
and run the relevant checks from [the toolchain guide](reference/toolchain.md).
For shared schema changes, follow [schema evolution](guides/schema-evolution.md)
and record compatibility, affected consumers, versioning/migrations and relevant
compatibility tests in the issue or PR.
Keep fixing commands separate from read-only checks; never automatically stage
formatter changes. Include essential failure handling, configuration, and docs.

Follow [the documentation guidance](AGENTS.md). Keep current commands and
limitations in docs. Summarize routine validation in the review handoff or PR;
do not create journals, version inventories, or installation evidence. Retain
experiments only for unresolved behavior that upstream documentation does not
explain, and keep decision-relevant findings short in the relevant ADR.

## Review and publication

All contributions reach `main` through a pull request.

Leave implementation changes available for local review. Implementation does not
authorize staging, commits, pushing, PR creation, deployment, or merge. Existing
explicit authorization persists for its agreed scope.

Use Conventional Commit subjects such as `build(toolchain): pin development tools`.
Before publication, review the complete branch diff, commit series, working tree,
and any existing PR. Account for every change and reuse the branch's PR.
PR descriptions explain the resulting behavior, relevant validation, and limits.
Use drafts for incomplete work and a separate `Closes #N` for each fully delivered
issue. The maintainer owns approval and merge; do not self-approve or enable
an automatic merge.

## Keep GitHub state current

Update issue scope and checklists when implementation or maintainer direction
changes them. Check items only when supported by actual work. Distinguish local
completion from merged delivery and keep implementation issues open until merge.
Keep dependencies and milestone descriptions consistent with the code and plan.
Close a milestone only when its scoped work is merged, its release criteria pass,
and the maintainer authorizes closure.

Address review feedback locally and repeat the authorized review/publication
steps. Explain technical disagreements with evidence. Disclose failed or
unavailable checks. Deployments, paid resources, destructive drills, and external
communications need authorization for those actions.
