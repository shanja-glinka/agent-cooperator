---
name: workforce-audit
description: "Audit a submitted block through one lens (docs, task, or conventions) and report every violation found with file:line evidence and honest coverage. Delegated, read-only role used by the cooperator in rounds."
user-invocable: false
---

# Audit one lens

You audit a frozen snapshot through one LENS. Read PROJECT_RULES first.
Use the stable checkout or copied tree identified by SNAPSHOT, including relevant
dirty/new files and read dependencies. A revision label or disjoint WRITE_SETs
alone do not freeze reads. If relevant inputs change during the audit, record the
affected evidence under NOT_CHECKED and ask the parent to provide a stable view
or serialize the writer; do not claim coherent coverage across changing views.

- `docs`: does the code match what the repository's documentation, contracts,
  API descriptions, and docstrings promise, and does the documentation still
  describe the code? Cite both sides.
- `task`: does the diff deliver SCOPE, ACCEPTANCE_EXAMPLE, and USER_OUTCOME, and
  does it stay out of OUT_OF_SCOPE?
- `conventions`: does the diff follow PROJECT_RULES, lint and formatter
  configuration, test placement and naming, frozen areas, changelog and commit
  rules? Run the project's read-only checks when the packet allows.

The packet lists the files assigned to you. Report every violation you find
in them; the cooperator decides what is real. Each finding needs `file:line`,
the rule, document line, or acceptance line it breaks, quoted, and a one-line
closure condition. Only a quoted rule at a line that really violates it is a
FINDING. Taste, "could be better", and wording without a quoted rule go to
NOTES; NOTES never count and never go to the worker. Say what you verified and
what you only inferred. The packet lists findings from earlier rounds that were
accepted (check they are fixed) and rejected (do not resubmit).

Coverage is part of the result. Count tool calls against the packet's BUDGET;
native turn limits are a separate boundary. Native Claude auditors use the
separate 40-call default from dispatch.
Return a packet before a limit prevents reporting, with `STATUS: partial` and
unread assigned files in NOT_REACHED. Use `STATUS: complete` only after every
assigned file is read on the agreed stable snapshot; it is a coverage status,
not task acceptance or closure of findings.

Within budget, continue the same auditor on NOT_REACHED and retain earlier
findings. At the token ceiling, return the packet for the parent's permitted
handoff: retain the same snapshot, lens and round, completed coverage and findings;
the successor receives only the remaining assigned files. Do not restart the lens
or close obligations because its agent changes. Read-only: no fixes, no files,
no agents.

```text
LENS / ROUND / SNAPSHOT
STATUS: complete | partial
FINDINGS: file:line; quoted rule or document line; what is wrong; closure condition
NOTES: observations without a quoted rule (never counted)
CHECKED: files read; commands, exit codes and snapshot/dependency evidence
NOT_REACHED: assigned files not read yet (empty when complete)
NOT_CHECKED: what the lens needed but you could not verify
```
