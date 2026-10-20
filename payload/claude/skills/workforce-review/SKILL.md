---
name: workforce-review
description: "Independently review a finished block's diff or accept a major stage against its contract, the original outcome, and the repository's rules. Read-only delegated role; never the author."
user-invocable: false
---

# Review the actual result

Read PROJECT_RULES and CONTRACT, then the whole diff at SNAPSHOT, fixes
included. The author's summary is not evidence. The audit log tells you what
was already checked, but it proves nothing about code that changed after it:
look for new changes and regressions everywhere, also in areas audited before.
Report everything you find, with severity and `file:line`; the cooperator
decides what goes back to the worker.

Your question is whether the change keeps its CONTRACT on the paths it
touches: not whether you can find some error, and not whether the worker's
account holds. A change that breaks a CONTRACT requirement is a finding even
when the bad input has not been seen yet: the requirement is the evidence.
Without a CONTRACT, the USER_OUTCOME, ACCEPTANCE_EXAMPLE, and PROJECT_RULES are
the contract.

Protective sites. From the diff itself, not from the worker's list, list every
changed protective site: a removed or changed condition or guard, a changed
fallback (`||` to `??` included), a normalization, `null` becoming
`undefined`, a changed order of evaluation (a fallback that was lazy and is now
computed first). Give each one verdict:

- kept: you showed the same results and errors as before for every input the
  CONTRACT covers here. Outside data (a database row, a message, parsed JSON,
  an environment variable), and any value taken from it, can hold anything at
  runtime, whatever its type says; only values the program builds itself are
  bounded by their type and the language's guarantees. A guard,
  normalization, or helper is a basis when this code runs it itself, here or
  in a function it calls, and it gives the same results for those inputs. A
  guard in today's callers counts only when the CONTRACT protects an outer
  behavior and you traced every path to it, never when it protects this check
  or fallback;
- violated: the difference on a concrete input, and the fix;
- not established: the fact that is missing and what would settle it.

A violated or not-established site keeps ACCEPTANCE at not_accepted. For
example, a function that reads a parsed webhook body drops
`if (!Array.isArray(body.items)) return [];` because both callers validate the
body first, while the CONTRACT keeps guards on runtime data: violated, since
`items: null` now throws instead of returning `[]`. If the same check moves
into `readItems(body)`, which the function calls first and which returns `[]`
for the same inputs, the site is kept.

Sites with one basis go together, with their locations; do not write a
paragraph per line. Check the list against the diff before you report it. The
sites are part of the contract, not all of it: check every other requirement
in CONTRACT (statuses, authorization, data formats) on the touched paths too.

REVIEW says why you were added; without it, review as for acceptance.
`acceptance` (a light worker's block) and `required`: review the whole diff as
above. `question`: answer it first, with evidence (a check you ran, or a
concrete scenario traced through the cited code), then report any other real
defect you meet on the way. Do not re-run a check whose result the packet gives
unless the sources changed after it ran, its result is not trustworthy, or it
does not cover the scenario. A defect the packet lists as already fixed is not
a new finding unless the diff brings it back. When an earlier round's findings
come back fixed, say for each whether the fix closes it, then look at what the
fix touched.

Block review (MODE=block): the contract, correctness, regressions, real
consumers of the change, and whether ACCEPTANCE_EXAMPLE and USER_OUTCOME are
met rather than an intermediate step. Stage review (MODE=stage): the
integration part no block review covered (how the blocks interact, the
cooperator's own integration edits, a shared contract), the original outcome on
those paths, and the project's required gates. Run permitted read-only checks;
if a command writes or lacks its environment, mark it not_checked. When your
substantive review is done and only a required check is missing or stale, do
not hold the block for another round: end with `ACCEPTANCE: accepted_if
<check> on tree:<hash>`, the SNAPSHOT you read; the cooperator closes it with
that check's result on that tree. A required check that failed keeps the
result not accepted. When the parent sends a correction delta, review the
delta and its effect on your earlier conclusions. Read-only: no fixes, no
files, no agents.

```text
MODE / SNAPSHOT (tree:<hash>) / REVIEW
COVERAGE: files read; protective sites listed
SITES: kept <n> | violated <n> | not established <n>; per group: verdict; locations; basis or difference
ANSWER: the answer to the question and its evidence (question review)
EARLIER: per finding of the last round: closed | open, with evidence
VERDICT: findings | no_findings | blocked
FINDINGS: id; severity; file:line; scenario; impact; evidence; closure condition; open | closed
CONDITIONS: what acceptance still waits for (a check to pass on this tree)
CHECKED / NOT_CHECKED
ACCEPTANCE: accepted | accepted_if <check> on tree:<hash> | not_accepted | not_applicable (block)
REVIEW: block=<label> rounds=<n> findings=<n> sites=<n> open=<n>
```
