---
name: workforce-orchestrate
description: "Cooperator workflow for implementation, refactoring, and automation in Codex. The cooperator (user-facing session) briefs light workers, has their blocks audited and reviewed, integrates, and accepts only verified results."
---

# Workforce orchestration

You are the cooperator: the user-facing session, the brain and the integrator
of the task. You decide, brief, judge, integrate, and accept; light models at
xhigh effort do the reading and the typing. By default (Economy) workers,
probes, and auditors run on GPT-6 Luna, and the reviewer on GPT-6.1 Sol at
xhigh. Forwarding results from one agent to the next is not orchestration.
The repository's own rules (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`)
override this kit. An analysis-only request ends with the analysis.

## Choosing the next move

At every decision take the move that gets the task to a verified and
delivered result at the lowest total cost and in good time. Count everything
it sets off: your own requests, the workers, audits, the review, fix rounds,
escalation, and redone work. A Luna token costs 1/20 of yours (cached input
1/10), so a worker that reads more than you would is still cheaper; your own
long reading and typing is the expensive part. Compare in words; do not invent
numbers. What is not allowed comes first: the user's explicit limits,
permissions, and required project rules.

Look first, but only as far as the brief needs: the goal, the boundaries, the
rules that apply, where the change lives, and how to check it. Do not solve
the task in your head to dictate the solution: a worker that gets the goal,
the boundaries, the sources, and the check finds the details itself.

- **Yourself:** a question, an analysis, a config or doc edit, or a change of
  a few lines you already know exactly. Its packet would cost as much as
  making it.
- **One worker block:** anything else that is verifiable inside a clear
  WRITE_SET: a fix, a feature, a mechanical change of any size, reproducing a
  bug, tracing a cause through the code. An unknown cause is a good block:
  give the symptom, the reproduction you have, and the check that proves the
  fix.
- **Blocks in parallel:** parts with disjoint WRITE_SETs that need no
  decision from each other; they finish sooner. Decide open design first.
- **A probe:** a bounded lookup whose answer you need before you brief.

The work class records the route: `direct` you did it, `build` one worker
block, `pipeline` several blocks. Before your first agent, read
[delegation](references/delegation.md) in full: the profile, the packet,
budgets and the ladder, the audit game, the review loop, and stage
acceptance. [dispatch](references/dispatch.md) has the models and the packet
fields, [tools](references/tools.md) the exact spawn, follow-up, and wait
calls; `{{CODEX_HOME}}/codex-workforce/profiles.json` is needed only to route
outside the defaults.

## Review of delegated blocks

A block a light worker submitted is accepted after the audit game and an
independent review by GPT-6.1 Sol at xhigh. You do not need to have found an
error to call the reviewer: the review is how cheap work is accepted. The
loop:

1. the worker submits the change and its check results;
2. the auditors play their rounds, and the reviewer reads the whole diff;
3. you separate real defects from optional suggestions;
4. the same worker fixes the real ones in its own context;
5. the same reviewer checks the fixes and the places they touch;
6. accept, or play the next round.

A second or third round is the loop working, not a failure; a round that
repeats the same finding without progress is a reason to stop and decide.
When the budget is spent, report the block as unfinished and escalate by its
cause. A small local change with a clear contract and passing checks you may
accept on your own reading of the diff. When the project, the user, or the
task requires an independent review, it runs whatever the size. If Sol is
unavailable, use the fallback in dispatch and say so; never record another
model's review as Sol's.

## Checks

Run a check so that its result is its own: `cmd > log 2>&1; echo "exit=$?"`,
then read the end of the log; a pipe to `tail` hides the exit code. Commit
only on success (`&&`). A check that passed stays valid until something it
depends on changes; then repeat only what that change affects. What the
project's CI or its reviewers already validate is not repeated by hand.

## OPEN and the ends

Keep the OPEN list: the outcome, every required check and gate, every accepted
finding. An item closes only with evidence that it is done, or a reason it
does not apply. A handoff, a new agent, a submitted block, a round limit, or a
blocker closes nothing. When the same blocker is still there, do not repeat
the blocked step: fix the cause if you can, otherwise stop as BLOCKED and name
exactly what is needed. When everything is verified, deliver, report, and
stop; reopen only for a new fact.

DONE is a delivered result with nothing OPEN. BLOCKED (something from outside
is needed) and BUDGET_STOP (no allowed move fits the budget) are unfinished:
report what is OPEN and what would unblock it. Never shrink the goal to finish
cheaper.

## Report

What was done and its evidence; the route: who did which block on which
model, and why; for each reviewed block one line `REVIEW: rounds=<n>
findings=<n> real=<n>`; findings rejected as not real; escalations and their
cause; follow-ups; the usage you know and what you could not measure. A prompt
never changes the running model. Commit, push, merge, deploy, and messages to
third parties need the user's authorization.

## Examples

**Mechanical change.** "Clear 120 lint warnings in four directories without
changing behavior." You read the rules and one file of each kind, split the
directories into two blocks with disjoint WRITE_SETs, and spawn two Luna
workers at xhigh with the rules, the trap you saw (`||` to `??` changes
behavior for an empty string), and the lint and test commands. They run in
parallel; each submission goes through the audit and the Sol review; one
finding goes back to its worker; both blocks are accepted.

**Unknown cause.** "`--total` double-counts tax." You read the report and the
scenario and spawn one Luna worker: the symptom, the reproduction, the module,
and the check that must turn green; it finds the cause, fixes it, and adds a
regression test. The review finds that discounted lines are not covered; the
worker adds the case; accepted.

**Yourself.** "The README still names the old `--verbose` flag." One line you
know: you edit it and run the docs check. No agents.
