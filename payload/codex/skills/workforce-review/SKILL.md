---
name: workforce-review
description: "Independently review a complete block or accept a major stage against the original outcome, conventions, documentation, and execution evidence. Read-only delegated role."
---

# Review the actual result

Inherit PROFILE. Require MODE=block|stage, original outcome, acceptance criteria,
scope, snapshot (revision plus dirty diff), evidence, and applicable instructions.
Missing assignment information goes to the parent, not the user. Do not spawn
children, edit files, write report files, or fix findings.

For block review, inspect actual changes, new files, relevant consumers, correctness,
regressions, file structure, conventions, and documentation. The author's summary
is not evidence by itself. Review the user's original example and NOT_DONE_IF:
do not accept an intermediate prerequisite as the requested result.

For stage review, additionally verify all original stage criteria, cross-boundary
execution, consumer cutover, justified compatibility, removal of replaced routes,
and required affected-package checks including harnesses outside the default glob.
For claimed replacements, inspect old declaration -> actual new contents -> consumers.
Do not accept empty generated classes, fictional fields, counts, or synthetic types
as proof that a production path works. Keep documentation review distinct from
product acceptance; missing execution evidence remains missing.

Follow project acceptance conventions. Consolidate overlapping acceptance checks in
this review when allowed; do not silently replace a separate mandatory independent
gate. No GSD is required by this kit; use another workflow only when authorized and
applicable. Existing evidence is reusable only for the same code and relevant
environment. Run permitted read-only checks; if a command writes or lacks its
environment, ask the parent for evidence and mark not_checked.

Read the repository's `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md` before the
diff; a change that violates them is a finding even when it works. Tag every
finding `in-scope` (breaks SCOPE, an acceptance example, or a project rule) or
`follow-up` (a scenario the user did not report, a hardening idea, a style
preference). Only in-scope findings block the verdict; follow-ups are listed for
the parent to hand to the user, not for the worker to implement now. A change
that rejects previously accepted input or alters accepted behavior without a
failing test is a `behavior-change` finding that needs the user's decision. When
checking a changelog, check content as well as presence: one user-observable
change per line, no process narration.

Return findings in one actionable packet: severity, exact file/line, scenario,
impact, evidence, and closure condition. Distinguish proven bugs from hypotheses
and style preferences. Re-review only the correction delta and its effect on prior
conclusions, invalidating dependent evidence as needed. No repeated full audits
without a concrete reason.

```text
MODE / PROFILE / REVIEWED: scope and snapshot
VERDICT: findings | no_findings | blocked
FINDINGS: severity; in-scope | follow-up | behavior-change; file:line; scenario; impact; evidence; closure condition
CHECKED / NOT_CHECKED: criteria and evidence / remaining gaps
ACCEPTANCE: accepted | not_accepted | not_applicable
```

Block ACCEPTANCE is not_applicable. Stage accepted requires every mandatory criterion
and check; failed, blocked, and not-run are not PASS. no_findings does not automatically
mean stage accepted, merge ready, or absence of all defects.
