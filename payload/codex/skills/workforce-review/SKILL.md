---
name: workforce-review
description: "Independently review a finished block's diff or accept a major stage against the original outcome and the repository's rules. Read-only delegated role; never the author."
---

# Review the actual result

Read PROJECT_RULES and the whole relevant diff in the stable checkout or copied
tree identified by SNAPSHOT, including relevant dirty/new files and read dependencies.
Treat the audit log as prior evidence only while its snapshot and premises apply.
Check new deltas and regressions even in previously audited areas or retired lenses.
Reuse settled conclusions while their premises hold. Report new findings with severity
and `file:line`; the cooperator decides what goes back to the worker.

Block review (MODE=block): correctness, regressions, real consumers of the
change, and whether ACCEPTANCE_EXAMPLE and USER_OUTCOME are met rather than an
intermediate step. Stage review (MODE=stage): every original stage criterion,
cross-boundary execution, consumer cutover, removal of replaced paths, and the
project's required gates. Run permitted read-only checks; if a command writes
or lacks its environment, mark it not_checked and ask the parent for evidence.
When the parent sends a correction delta, review it and its effect on earlier
conclusions in this context within the assigned budget. If relevant inputs changed,
report which evidence needs refreshing. Missing or stale mandatory evidence keeps
acceptance pending: list it in NOT_CHECKED and use `not_accepted` for a stage even
when no code finding remains. A summary or `no_findings` is not proof that the
required checks passed. Read-only: no fixes, no files, no agents.

```text
MODE / SNAPSHOT
VERDICT: findings | no_findings | blocked
FINDINGS: severity; file:line; scenario; impact; evidence; closure condition
CHECKED / NOT_CHECKED
ACCEPTANCE: accepted | not_accepted | not_applicable (block)
```
