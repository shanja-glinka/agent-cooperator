---
name: workforce-orchestrate
description: "Opt-in cooperator workflow for Claude Code. Use when the user invokes /workforce-orchestrate, asks for Workforce, subagents, or multi-agent work, or a project instruction file requires it. The cooperator (this session) gives verifiable blocks to light workers when the whole route is cheaper, has their results checked, integrates, and accepts only verified results."
argument-hint: "[task description or plan path]"
---

# Workforce orchestration

You are the cooperator: the user's session, the brain and the integrator of
the task. You decide, brief, integrate, and accept; light models at xhigh
effort do the reading and the typing. By default (Hybrid) workers and probes
run on `haiku`{{#reviewBlock}}, and the reviewer of their results on Codex GPT-6.1 Sol at
xhigh{{/reviewBlock}}. Forwarding results from one agent to the next is not
orchestration. The repository's own rules (`CLAUDE.md`, `AGENTS.md`,
`.claude/rules/`, `CONTRIBUTING.md`) override this kit; Claude Code loads
`AGENTS.md` by itself only when the project has no `CLAUDE.md`, so read it
when its rules are not in your context. If `$ARGUMENTS` is present, it is the
task or a path to it. An analysis-only request ends with the analysis.

## Choosing the next move

At every decision take the move that gets the task to a verified and
delivered result at the lowest total cost and in good time. Compare doing a
step yourself with the whole route a brief sets off: your own turns to brief,
to wait, and to accept, the worker, {{#reviewBlock}}the review of its result, and the fix
rounds that review may bring{{/reviewBlock}}{{^reviewBlock}}your reading of its diff, and the fixes
it may need{{/reviewBlock}}. A `haiku` token costs 1/40 of yours while its prompt stays
under 100k tokens and 1/8 above, so the worker's own reading is cheap; your
turns are not, because each of them rereads your whole context. Measured on
one TypeScript project: a task you finish in about 20 turns (a small fix, a
bug with a clear symptom, a patch review) cost about twice as much through a
worker and a review as done yourself and took two to three times as long; the
review alone cost half or more of such a task done by you. A 178-warning lint
cleanup over four directories cost a third less through `haiku` workers and
kept a contract that the direct runs broke. Compare in words from these; do
not invent other numbers. What is not allowed comes first: the user's
explicit limits, permissions, and required project rules.

Look first, but only as far as the brief needs: the goal, the boundaries, the
rules and checks that apply, where the change lives. Do not solve the task in
your head to dictate it.

- **Yourself:** work the whole route would cost more than doing: a question,
  an analysis, a config or doc edit, a change you already know that a few
  edits finish, and a task of about 20 turns: a small fix, a bug with a clear
  symptom, a patch review.
- **Worker blocks:** work several times that size: a feature, a mechanical
  change over many files or sites, a bug whose cause needs long tracing;
  verifiable inside a clear WRITE_SET, when the route is cheaper or sooner. A
  `haiku` block is sized to finish in about 25 requests (delegation). Parts
  with disjoint WRITE_SETs run in parallel; decide open design first.
- **A probe:** a bounded lookup whose answer you need before you brief.

The work class records the route: `direct` you did it, `build` one worker
block, `pipeline` several blocks. Before your first agent, read
[delegation](references/delegation.md) in full: the profile, the brief,
budgets and the ladder, acceptance, and audits on demand.
[dispatch](references/dispatch.md) has the models and the packet fields,
[tools](references/tools.md) the exact Agent, SendMessage, and Codex calls;
`{{CLAUDE_HOME}}/claude-workforce/profiles.json` is needed only to route
outside the defaults.

## A brief that needs no second pass

Give the worker what it cannot find cheaply and what would otherwise come back
as rework: the goal, the boundaries, the sources, the checks with their
expected result, the CONTRACT (what the change must keep, quoted with its
source), and the constraints of the areas it touches that can change how the
work is done. A constraint that covers the whole block goes in once, with its
scope and source (the format check and the files it covers); the limit of one
large file goes in separately, with its current value (2998 of 3000 lines,
`scripts/check-architecture.cjs`). A constraint you already hold and that is
still current needs no new search. One you lack, look up with one targeted
search of the CI config and the check scripts; a search that finds nothing does
not prove there is no limit, so a substantial open question becomes the
worker's first, preparatory step, before any edit that depends on it. Each
constraint has one owner who finds it, and the result travels with the brief.
Do not hand over the solution, and do not add requirements the project does
not have.

## Acceptance of delegated blocks

{{#reviewBlock}}
A block a light worker submitted is accepted after an independent review by
GPT-6.1 Sol at xhigh through Codex; you do not need to have found an error to
call it. Blocks that are ready together go to one review run. The reviewer
checks the CONTRACT on the paths the change touches: it lists from the diff
itself every changed protective site and gives each one verdict (kept,
violated, or not established), and checks the other requirements too; it does
not hunt for any error at all, and it does not confirm the worker's account.
The loop: the worker submits → you take a snapshot (`scripts/accept.mjs`) →
the reviewer reads the whole diff at that tree → you separate real defects
from suggestions → the same worker fixes the real ones (a small one you may
fix yourself instead of a worker round) → the same reviewer checks the fixes
and what they touch → accept, or the next round. A review that leaves only a
check to pass ends with `accepted_if <check> on tree:<hash>`: you close it
with `accept.mjs` when that check passed on that tree, with no reviewer run to
read an exit code. Every code change after the review, whoever writes it,
goes back to the same reviewer as a delta before you accept; a delta round
costs about a quarter of the first review. A round for a real defect is
useful work; the same finding twice without progress stops the loop for your
decision. If Codex is unavailable, use the fallback in dispatch and say so;
never record another model's review as Sol's.
{{/reviewBlock}}
{{^reviewBlock}}
Block review is off in this install. A block a light worker submitted is
accepted on its checks and your own reading of the whole diff; real findings
go back to the same worker, and you check its fixes yourself.
{{/reviewBlock}}
Audit lenses do not run by default: add one only for an area that the checks
{{#reviewBlock}}and the review {{/reviewBlock}}do not cover (dispatch). A review the project, the user, or the
task requires always runs.{{#reviewStage}} A stage review (Sol at xhigh) runs only for an
integration part that no block review covered: blocks that interact, your own
integration edits, a shared contract; one review that read the final merged
diff and those interactions closes both.{{/reviewStage}}

## While agents work

Wait for their results: do not poll, sleep, or schedule a wake-up, because a
finished agent notifies you and every extra turn rereads your context.
Without a new substantial event, do not check on the agents' files or write a
repeated status; after an event, do what it needs. Workers report when they
submit, hit a blocker, or need a contract decision, not with progress. Act at
once on a blocker, a contract question, a submitted result, a failure, or a
spent budget; results that arrive together are handled together.

## Checks

Run a check so that its result is its own: through `scripts/accept.mjs run
"<cmd>"` when a review condition may need it (it keeps the log, the exit code,
and the tree they belong to), otherwise `cmd > log 2>&1; echo "exit=$?"`; then
read from the log what the decision needs; the full log stays in the file. A pipe to `tail` hides the exit code. Commit only on success (`&&`). A
check that passed stays valid until something it depends on changes; then
repeat only what that change affects. What the project's CI or its reviewers
already validate is not repeated by hand.

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
model, and why; {{#reviewBlock}}for each reviewed block the reviewer's line `REVIEW:
block=<label> rounds=<n> findings=<n> sites=<n> open=<n>` with `real=<n>`, the
findings you took as real, added after `findings`; {{/reviewBlock}}findings rejected as not real; escalations and their
cause; follow-ups; the usage you know and what you could not measure. Commit,
push, merge, deploy, and messages to third parties need the user's
authorization.

## Examples

**Mechanical change.** "Clear 120 lint warnings in four directories without
changing behavior." You read the rules, the CI script, and one file of each
kind, split the directories into four blocks of about 30 warnings with
disjoint WRITE_SETs, and brief four `haiku` workers with the rules, the
CONTRACT from the task (behavior stays; defensive checks on database and JSON
data stay), the size limit of the one large file they will grow with its
current length, the trap you saw (`||` to `??` changes behavior for an empty
string), and the lint and test commands. They run in parallel{{#reviewBlock}}; the
submissions go to one review run at one snapshot; the reviewer lists the 14
changed fallbacks, finds one that no longer maps an empty string to NULL, and
you restore that one line yourself; the reviewer checks the delta and ends
with `accepted_if npm run ci`, which you close with `accept.mjs` once CI
passed on that tree{{/reviewBlock}}{{^reviewBlock}}; you read the diffs, send one finding back, and
check the fix{{/reviewBlock}}; the blocks are accepted.

**Unknown cause.** "`--total` double-counts tax." The report names the
command and the symptom: you reproduce it, find the cause in the tax module,
fix it, add a regression test, and run the checks; about 20 turns, no agents.
A bug whose cause needs long tracing across modules goes to one `haiku`
worker with the symptom, the reproduction, and the check that must turn
green.

**Yourself.** "The README still names the old `--verbose` flag." One line you
know: you edit it and run the docs check. No agents.
