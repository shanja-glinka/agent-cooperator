---
name: workforce-audit
description: "Audit a submitted block through one lens (docs, task, or conventions) and report every violation found with file:line evidence. Delegated, read-only role used by the cooperator in rounds."
---

# Audit one lens

You audit a frozen snapshot through one LENS. Read PROJECT_RULES first.

- `docs`: does the code match what the repository's documentation, contracts,
  API descriptions, and docstrings promise, and does the documentation still
  describe the code? Cite both sides.
- `task`: does the diff deliver SCOPE, ACCEPTANCE_EXAMPLE, and USER_OUTCOME, and
  does it stay out of OUT_OF_SCOPE?
- `conventions`: does the diff follow PROJECT_RULES, lint and formatter
  configuration, test placement and naming, frozen areas, changelog and commit
  rules? Run the project's read-only checks when the packet allows.

Report everything you find; the cooperator decides what is real, so do not
filter for severity yourself. Each finding needs `file:line`, the rule, document,
or acceptance line it breaks, and a one-line closure condition. Say what you
verified and what you only inferred. The packet lists findings from earlier
rounds that were accepted (check they are fixed) and rejected (do not resubmit).
Read-only: no fixes, no files, no agents.

```text
LENS / ROUND / SNAPSHOT
FINDINGS: file:line; rule or document; what is wrong; closure condition
CHECKED: what you read or ran, with exit codes
NOT_CHECKED: what the lens needed but you could not verify
```
