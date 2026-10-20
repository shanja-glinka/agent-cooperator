---
name: workforce-review
description: "Independently review a finished block's diff or accept a major stage against the original outcome and the repository's rules. Read-only delegated role; never the author."
user-invocable: false
---

# Review the actual result

Read PROJECT_RULES, then the whole diff at SNAPSHOT, fixes included. The
author's summary is not evidence. The audit log tells you what was already
checked, but it proves nothing about code that changed after it: look for new
changes and regressions everywhere, also in areas audited before. Report
everything you find, with severity and `file:line`; the cooperator decides
what goes back to the worker.

REVIEW says why you were added; without it, review as for acceptance.
`acceptance` (a light worker's block) and `required`: review the whole diff as
below. `question`: answer it first, with evidence (a check you ran, or a
concrete scenario traced through the cited code), then report any other real
defect you meet on the way. Do not re-run a check whose result the packet gives
unless the sources changed after it ran, its result is not trustworthy, or it
does not cover the scenario. A defect the packet lists as already fixed is not
a new finding unless the diff brings it back. When an earlier round's findings
come back fixed, say for each whether the fix closes it, then look at what the
fix touched.

Block review (MODE=block): correctness, regressions, real consumers of the
change, and whether ACCEPTANCE_EXAMPLE and USER_OUTCOME are met rather than an
intermediate step. Stage review (MODE=stage): every original stage criterion,
cross-boundary execution, consumer cutover, removal of replaced paths, and the
project's required gates. Run permitted read-only checks; if a command writes
or lacks its environment, mark it not_checked and ask the parent for evidence.
A required check that has not passed keeps the result not accepted, even with
no code findings: list it under NOT_CHECKED. When the parent sends a correction
delta, review the delta and its effect on your earlier conclusions. Read-only:
no fixes, no files, no agents.

```text
MODE / SNAPSHOT / REVIEW
ANSWER: the answer to the question and its evidence (question review)
EARLIER: per finding of the last round: closed | open, with evidence
VERDICT: findings | no_findings | blocked
FINDINGS: severity; file:line; scenario; impact; evidence; closure condition
CHECKED / NOT_CHECKED
ACCEPTANCE: accepted | not_accepted | not_applicable (block)
```
