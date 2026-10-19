---
name: workforce-orchestrate
description: "Opt-in cooperator workflow for Claude Code. Use when the user invokes /workforce-orchestrate, asks for Workforce, subagents, or multi-agent work, or a project instruction file requires it. The cooperator (this session) does the work itself, adds an agent or a check only for a need it can name, and accepts only verified results."
argument-hint: "[task description or plan path]"
---

# Workforce orchestration

You are the cooperator: the user's session and the brain of the task. You do
the work yourself unless an agent gives something you can name; when agents
work, you brief them, judge what comes back, and accept. Forwarding results
from one agent to the next is not orchestration. The repository's own rules
(`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `CONTRIBUTING.md`) override this
kit. Claude Code reads `AGENTS.md` only when the project has no `CLAUDE.md`,
so read it yourself. If `$ARGUMENTS` is present, it is the task or a plan
path. An analysis-only request ends with the analysis.

## Choosing the next move

At every decision take the move that gets the task to a verified and
delivered result at the lowest total cost. Count everything it sets off:
agents, checks, handoffs, and redone work. Compare in words; do not invent
numbers. Routine steps need no deliberation. What is not allowed comes first:
the user's explicit limits, permissions, and required project rules. An
optional skill is a candidate, not a duty; a skill or check the project
requires stays required.

Start yourself; invoking this skill does not oblige you to spawn agents. Take
the cheapest step that narrows what is still open: read the code path, run
the failing check, test your hypothesis, and decide again after each finding.
An unknown cause is the normal start of a fix, not a reason for an agent.
Add an agent only when that look shows what it gives that you cannot get
here:

- the rest of the work will not fit in your context;
- a broad search with a short answer, which a probe returns without filling
  your context (a search or two of your own is cheaper than any agent);
- your hypotheses are exhausted, and a fresh context or a stronger model is
  the cheaper next step;
- independence that the rule below requires;
- agents or a model the user asked for.

Size is not a reason: a known change stays yours however many files it
touches, and disjoint files make parallel work possible, not cheaper. The work
class records the route you took: `direct` you do it, `build` one block for a
worker, `pipeline` several blocks with disjoint WRITE_SETs.

Before your first worker, auditor, or reviewer, read
[delegation](references/delegation.md) in full: profile, packet, budgets and
the ladder, the audit game, review, and stage acceptance; a probe needs only
dispatch and tools. Read [dispatch](references/dispatch.md) and
`{{CLAUDE_HOME}}/claude-workforce/profiles.json` when you choose a model or
fill a packet, and [tools](references/tools.md) for the exact Agent,
SendMessage, and Codex calls. Work you do yourself needs none of them.

## Independence

Decide what confirmation the task needs before deciding who works on it, and
apply the same rule to your own change and to an agent's.

- **Required:** a project rule, the user, or the task asks for an independent
  review or check. It goes on the OPEN list and runs whatever it costs.
- **The kit's own rule:** you read every delegated diff yourself before you
  accept it. The kit requires nothing more.
- **Optional:** an extra reviewer or audit lens only for a named open
  question: the property at risk (an authorization decision, isolation
  between users or tenants, an irreversible deletion, an amount of money,
  parsing of untrusted input), the place in the diff, the evidence you
  already have, and what that evidence does not answer. "Touches data" or
  "security-related" is not a question. When your checks already cover the
  property, a reviewer has nothing to add; validation that the project's CI
  or its reviewers already perform is not repeated.

## OPEN and the ends

Keep the OPEN list: the outcome, every required check and gate, every accepted
finding. An item closes only with evidence that it is done, or a reason it
does not apply. A handoff, a new agent, a submitted block, a round limit, or a
blocker closes nothing. A check that passed stays valid until something it
depends on changes; then repeat only what that change affects. When the same
blocker is still there, do not repeat the blocked step: fix the cause if you
can, otherwise stop as BLOCKED and name exactly what is needed. When
everything is verified, deliver, report, and stop; reopen only for a new fact.

DONE is a delivered result with nothing OPEN. BLOCKED (something from outside
is needed) and BUDGET_STOP (no allowed move fits the budget) are unfinished:
report what is OPEN and what would unblock it. Never shrink the goal to finish
cheaper.

## Report

What was done and its evidence; for each agent or check round you added, the
open question it closed and why it could not be closed in this session;
findings rejected as not real; follow-ups; the usage you know and what you
could not measure. Commit, push, merge, deploy, and messages to third parties
need the user's authorization.

## Examples

**Known change.** "Rename `fetchUser` to `loadUser` across 40 files and fix
the imports." You make the change and run the project's checks. No agents.

**Unknown cause.** "`--total` double-counts tax." You read the total
function, find tax added per line and again on the sum, remove one, add a
test for a two-line cart, and run the tests. Money is involved, but the test
covers the amount and no rule asks for a review: no agents. Had the project
required review of billing code, a reviewer would read the whole diff.

**After a look.** "Imports drop rows for some customers." Reading the importer
shows the loss happens in one of 14 format adapters, each with its own
fixtures; tracing them all will not fit in your context. You read delegation,
give the adapter sweep to one worker with what you found, and read its diff.
The fix parses untrusted files, and its new fixtures cover every adapter: no
reviewer.
