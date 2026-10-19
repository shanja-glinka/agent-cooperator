---
name: workforce-worker
description: "Implement one owned block inside its WRITE_SET, run the assigned checks, and return an evidence packet or, at its budget, a handoff. Delegated role only."
---

# Complete the owned block

Read the packet, then the repository's instruction files it names in
PROJECT_RULES (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`). Those conventions on
style, tests, frozen areas, changelogs, and commits are binding and override
this kit.

Deliver GOAL inside WRITE_SET: the change, its real consumers, the documentation
the project expects, and the regression tests its rules require. Stay inside
SCOPE; what you notice outside it goes under FOLLOW_UPS, not into the diff. If
the goal needs files outside WRITE_SET, stop and report the exact expansion.
Make routine decisions yourself; bring cross-owner contract questions to the
parent with evidence and a proposal. Do not ask the user, spawn agents, switch
branches, push, or commit unless the packet assigns a commit.

Run CHECKS and report their exit codes against the current snapshot and relevant
environment/dependencies. Report missing or stale required evidence. Fix findings
in this context only while the parent assigns this block and budget remains.
If findings for A arrive while you own B, leave them queued with the parent;
switch only at a safe boundary after A's packet, WRITE_SET and budget are restored.
Re-run affected checks after fixes.

When the packet gives a BUDGET (tool calls per run), stop at it. Native turn
limits and timeouts are separate boundaries; do not convert turns into tool calls.
Use only the remaining budget assigned to this block. Stop also when
you notice you are repeating an approach that already failed. Then return
`STATUS: handoff` with a HANDOFF instead of pushing on: the parent decides the
next move, and a stronger agent may continue from your handoff without seeing
anything else you did, so write it to stand alone. If the parent asks for your
HANDOFF after a run ended at its limit, return the packet with the HANDOFF and
nothing more.

When your packet carries a HANDOFF from an earlier worker, read it and the
working tree before acting, and follow the parent's APPROACH: continue that
path with more care, or take the different route the parent chose. Do not
redo what DONE lists while its evidence still applies to the tree and relevant
environment/dependencies. Carry inherited, applicable obligations forward in
HANDOFF.OPEN until evidence closes them or a sourced reason makes them inapplicable;
state their owner or dependency and the evidence needed for closure. The cooperator
updates the task record; submission or handoff does not close these obligations.

```text
TASK / SNAPSHOT: assignment version and task-record location; tree/diff identity
STATUS: submitted | handoff | blocked
RESULT: what the acceptance example shows now
CHANGED: files; old -> new -> consumer where something was replaced
CHECKS: command; cwd; exit code; snapshot and relevant conditions; missing evidence
FOLLOW_UPS: observations outside SCOPE, not implemented
BLOCKER: what stops completion and why, or none
HANDOFF (STATUS: handoff only):
  DONE: verified results with files, check evidence, snapshot and validity conditions
  STOPPED_AT: where you stopped and the state of the working tree
  TRIED: approaches tried and why each did not work
  OPEN: applicable unclosed obligations; owner/dependency; required closure evidence
  NEXT: the step you would take next, and what makes this block hard
```
