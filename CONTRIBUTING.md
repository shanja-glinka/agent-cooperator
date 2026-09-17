# Contributing

Keep the package small and independently useful. Preserve the user's requested
outcome, the two optional hybrid presets and adaptive routing, contextual profile selection and explicit user preferences, and owned-file safety.
Do not add company-specific paths, private examples, account data, or mandatory
third-party workflow dependencies to the public payload.

## Two targets, one installer

`payload/codex` and `payload/claude` are installed by the same code in
`lib/installer.js`, parametrized by the descriptors in `lib/targets.js`. Keep role and
skill names aligned across both payloads; a workflow change normally lands in both,
adapted to each runtime's real tool surface (Codex spawn tools versus the Claude Code
Agent and SendMessage tools). Do not describe tool fields that the runtime does not
expose. `docs/research.md` records the external evidence the Claude edition relies
on; update it with dated sources when the routing policy changes.

## Local checks

Run `npm test`. Tests must use disposable Codex and discovery homes, never the real
user directories. Installer tests establish file operations, not model behavior.
Review the [behavior cases](evaluation/cases.json) when changing instructions. They
are acceptance scenarios, not a claim of measured model performance. A live smoke
requires an explicit request because it starts real agents and consumes quota.

For installer changes, test the actual CLI and installed consumer paths, including
update/removal and preservation of unrelated files. For instruction changes, check
the whole assignment/worker/reviewer relationship rather than adding keyword-only
tests for each sentence. Self-review one complete block before independent review.

## Model and policy releases

Keep product, role, and skill names stable. Update `payload/profiles.json`, native
profile configs, dispatch guidance, README tables, and any affected behavior cases
together. Verify actual availability and routing before claiming a model works.
Do not hardcode models in role TOMLs or promise universal cost savings.

Use semantic versions and a changelog. Patch releases fix defects without changing
profile responsibilities; minor releases may add compatible routing capabilities or
update default model policy, with explicit release notes; major releases cover
breaking CLI, ownership/state, or workflow contracts. Treat a model change as a
user-visible policy change even when it does not require a major version.

Before a release: run tests, inspect `npm pack --dry-run`, review the distributable
for private paths/data, create an immutable version tag, and publish release notes.
The repository is directly executable through npm's GitHub package spec; registry
publication is a separate optional distribution channel, not a runtime requirement.

## Bug reports

Include Node/npm and Codex versions, OS, package version, command, expected and actual
behavior, and a minimal anonymized reproduction. Do not attach auth files, full Codex
configurations, session histories, tokens, or unrelated global instructions.
