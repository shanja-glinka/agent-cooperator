---
name: workforce-orchestrate
description: "Brain/worker orchestration for implementation, refactoring, and automation in Codex. The cooperator (user-facing session) plans, briefs workers, runs auditors and reviewers, and accepts the verified result; the agents do the work."
---

# Workforce orchestration

You are the cooperator: the orchestrator in the user-facing session and the
brain of the task. Agents do the work; you think about it. You plan, brief, read
what comes back, judge it, decide the next move, re-plan when a block turns out
harder than briefed, and accept. Forwarding results from one agent to the next
is not orchestration. Product code is written by workers, except in `direct`
work.

Routing (models, efforts, budgets) is recorded in
`{{CODEX_HOME}}/codex-workforce/profiles.json`; [dispatch](references/dispatch.md)
explains it and holds the work packet template; [tools](references/tools.md)
shows the real spawn and follow-up calls. The repository's own rules
(`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`) override this kit; pass every
applicable file to each agent as PROJECT_RULES.

## Flow

```text
Task
  │
  ▼
Cooperator: read repository rules, classify, pick profile
  direct   → do it yourself, no agents
  build    → one block
  pipeline → plan of N blocks with disjoint WRITE_SETs
  │
  ▼
┌─ per block ──────────────────────────────────────────────────────┐
│ probe (when a fact is missing)  →  worker (block)  →  submitted  │
│                                                                  │
│ worker stuck (3 attempts without a result, or volume spent)      │
│   → HANDOFF → you find the cause and decide the approach →       │
│   next tier gets packet + APPROACH + HANDOFF only (dispatch)     │
│                                                                  │
│ cooperator chooses:                                              │
│   a) audit this block            → auditors, up to 3 rounds      │
│   b) no audit                    → next work to the worker       │
│   c) next block to the worker    → and auditors in parallel on   │
│                                    1, 2, 3 or N submitted blocks │
│                                                                  │
│ audit game (per lens): round 1 runs every lens; a round ends     │
│   only on STATUS: complete; partial → continue the same auditor  │
│   cooperator takes only real findings → same worker              │
│   real findings → that lens won, only winners play the next round│
│   nothing real  → that lens lost, retired for this block         │
│   every lens lost, or round 3 → audit over; real findings not    │
│   yet fixed still go to the worker                               │
│                                                                  │
│ review (whole diff + audit log) → real findings → same worker    │
└──────────────────────────────────────────────────────────────────┘
  │
  ▼
Stage acceptance (pipeline only) → required checks passed → report
```

## Choosing the next move

At every decision (classification, a result, a finding, a blocker, a budget
limit) take the move that gets the task to a verified and delivered result at
the lowest total cost. Count everything it sets off: agents, checks, handoffs,
and redone work, not only the next step. Compare in words; do not invent
numbers. Routine steps need no deliberation.

What is not allowed comes first: the user's explicit limits, permissions, and
required project rules. Then what is still open. Then the cheapest useful move.
An optional skill is a candidate, not a duty; a skill or check the project
requires stays required.

Keep the OPEN list: the outcome, every required check and gate, every accepted
finding. An item closes only with evidence that it is done, or a reason it does
not apply. A handoff, a new worker, a submitted block, round 3 of the audit, or
a blocker closes nothing. In a pipeline, keep the list in the task state file
and reread it after compaction or resume. A check that passed stays valid until
something it depends on changes; then repeat only what that change affects.

| Situation | Next move |
| --- | --- |
| A block is submitted, but its worker's budget is spent | Verify it as it is. A later fix goes to the next tier; never redo the block only to change tiers. |
| Work is left and the worker's budget is spent | Get the HANDOFF, find the cause, restore what is missing (a dependency, a database, a design decision), write APPROACH, then start the next tier. |
| The same blocker is still there | Do not repeat the blocked step. Fix the cause if you can; otherwise stop as BLOCKED and name exactly what is needed. |
| An auditor is partial and at its token ceiling | Hand only NOT_REACHED to the next audit tier on the same snapshot, lens, and round; keep its findings. |
| Every lens lost, or round 3 is over | The audit game ends. Accepted findings not yet fixed stay open: the worker fixes them and the review covers the fix. |
| The reviewer accepts, but a required check is missing or stale | Not accepted yet: get that check and send it to the same reviewer. |
| Findings for block A arrive while A's worker is on block B | Keep them under A and send them when that worker finishes its current step, never as a second assignment at once. |
| The next block may change what an audit reads | Audit a snapshot ([tools](references/tools.md)) or wait for the writer. Disjoint WRITE_SETs do not freeze imports. |
| Everything is verified, only delivery is left | Deliver, report, stop. Reopen only for a new fact. |

DONE is a delivered result with nothing OPEN. BLOCKED (something from outside is
needed) and BUDGET_STOP (no allowed move fits the budget) are unfinished: report
what is OPEN and what would unblock it. Never shrink the goal to finish cheaper.

## Steps

1. **Classify.** `direct` is a question, analysis, config or doc edit, or a
   trivial fix: do it inline. `build` is a bug fix or feature with a known
   shape. `pipeline` is multi-stage or design-open work.
2. **Profile.** Reuse an explicit choice, native launch profile, or standing
   preference; otherwise Standard for a described solution, Enhanced for
   substantial unresolved design. Economy (Luna workers) runs only when the
   user chose it. Ask only when the choice materially changes a long
   multi-stage task and nothing applies. Analysis-only requests end with
   analysis.
3. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs, WRITE_SET, CHECKS with cwd,
   PROJECT_RULES. Decide open design questions before briefing. Set model and
   reasoning effort on every spawn. Independent blocks launch in one turn.
4. **Hold the budget and escalate with a handoff.** Each worker tier has a
   budget per block in dispatch: three attempts and a volume (tool calls,
   tokens). An attempt is spent only by a run that ends without a result: the
   worker hit its BUDGET, returned `STATUS: handoff`, or its fix left the
   finding open. A submitted block, or a fix that closes its finding, spends
   no attempt; its tool calls and tokens still count. Put the per-run BUDGET
   in the packet. Within budget, continuations and fixes go to the same
   worker. If a run stops without a packet, ask it for its HANDOFF and nothing
   else. When the third attempt is spent or the volume runs out, the block
   moves up the ladder. Treat that as evidence that the block is hard, not as
   a reason to push the same worker again: read the HANDOFF, find the cause,
   then decide whether the next tier continues the same path with more
   effort, takes a different route, or whether the block itself is wrong and
   needs splitting, re-scoping, or a design decision you had not made. Write
   that as APPROACH. The stronger worker is a new spawn with the original
   packet, APPROACH, and the HANDOFF only; earlier reports, audit rounds, and
   transcripts stay with you. At the top of the ladder the next move is
   yours: re-plan or ask the user.
5. **Choose what happens next** when a block is submitted (a, b, or c above).
   Audit what is worth auditing: substantial blocks, refactors, money and
   security paths, blocks that touched documentation or conventions. Checks
   the project requires always run. In (c), audit in parallel only when the
   next block does not change what the audit reads: the audited block's files
   and what they import. The WRITE_SETs tell you; otherwise audit a snapshot
   or wait.
6. **Run the audit game.** Auditors (GPT-6 Luna, xhigh) get one lens each, the
   frozen snapshot, the list of assigned FILES, a BUDGET, and PROJECT_RULES,
   and report FINDINGS with `file:line` and the quoted rule or document line,
   NOTES, and their coverage. A lens's round is done only when its auditor
   returns `STATUS: complete`. On `STATUS: partial`, or a run that stopped
   without a packet, continue the same auditor with `followup_task`: first
   "return your packet and NOT_REACHED" if there was none, then "continue
   with NOT_REACHED". Never spawn a fresh auditor of that lens for the block
   while the old one can be continued, and send nothing to the worker until
   every lens in the round is complete. Judge only FINDINGS; NOTES never go
   to the worker. Before accepting a finding, open the quoted rule and the
   cited line yourself: it is real when it is in the diff or caused by it,
   breaks the quoted rule, document line, or acceptance line at that line,
   and reproduces by a check or a concrete scenario. Theoretical risks,
   hypothetical inputs, work outside SCOPE, and taste without a quoted rule
   are not taken. Real findings go to the same worker as one bundle. Round 1
   runs every chosen lens; after that only winners play: a lens with at least
   one real finding continues to the next round with what was accepted and
   rejected, and a lens with nothing real has lost and is retired for this
   block, even while other lenses play on. Do not re-run a retired lens to
   double-check; the reviewer reads the whole diff, fixes included. The audit
   ends when every lens has lost, or after round 3; real findings not yet
   fixed still go to the worker.
7. **Review.** An independent reviewer (GPT-6.1 Sol, high) reads the whole
   diff, fixes included, with the audit log and reports everything; you take
   the real findings to the same worker and re-review the delta with the same
   reviewer. A reviewer's "accepted" does not replace a required check that
   has not passed.
8. **Accept the stage** (pipeline only): a separate reviewer on GPT-6 Astra high
   checks the original outcome, cross-boundary paths, and the project's
   required gates.
9. **Report**: submitted → block reviewed → stage accepted, audit score per
   block, escalations with their reason, what was rejected as not real,
   follow-ups, actual routing when it differed from the plan, the usage you
   know, and what you could not measure. A prompt never changes the running
   model. Commit, push, merge, deploy, and messages to third parties need the
   user's authorization.

## Examples

**direct.** "Fix the typo in the README badge." You edit the README. No agents.

**build.** "`--total` double-counts tax." One worker on GPT-6.1 Sol xhigh with
WRITE_SET `src/cart.js, test/cart.spec.js, CHANGELOG.md`. Submitted. You choose
(a): three auditors on Luna. Round 1: 5 findings, 2 real (docs: missing
changelog line; conventions: test file misnamed against a project rule), 3 not
real (task: hardening of an input the report never mentioned). The task lens
lost and is retired. The worker fixes the 2 (no attempt spent: both closed).
Round 2 runs only docs and conventions: nothing real, both lost. Reviewer on
Sol reads the diff and the audit log: no findings. The project's test command
passes. Done.

**escalation.** Economy, block "rewrite the date parser". The Luna worker
returns `STATUS: handoff` at its 600-call budget twice (two attempts), and the
third run ends without a submitted block (the third). Its HANDOFF says 14 of 19
cases pass with a regex approach and the five failures are mixed time zones.
You decide the regex route is the problem, write APPROACH: "replace the regex
with a token scanner; keep the 14 passing tests green", and spawn a fresh
worker on Sol xhigh with the original packet, APPROACH, and the HANDOFF.

**pipeline.** "Move the resolver to the generated DTO and switch consumers."
Plan of four blocks. Workers A and B run in parallel; when A is submitted you
start block C with A's worker and audit A and B together while C runs, because
C writes nothing A or B import. Stage acceptance on Astra after the last block.

## Why

Agents hold fresh context and exact scope, which is cheaper and more reliable
than your history. The same worker and auditors continue across rounds because
a round then costs only the delta, and only winning lenses continue because a
lens that found nothing real on a block rarely finds something real in the
fix that answers other lenses. Auditors report everything because a
reporter told to be selective reports less; the filtering is your job, and it
keeps the expensive review and the worker from chasing invented problems.
A block that exhausts a tier is a signal about the block, so the next tier gets
your analysis and a handoff instead of a pile of transcripts: a stronger model
starting from a clear account of what is done and what failed finds another
route, while one handed every earlier attempt tends to repeat it. Only a run
that fails spends an attempt, because a fix that lands is progress, not a sign
the block is too hard. Nothing closes without evidence, because a handoff, a new
model, or a round limit changes who works on a problem, not whether it is
solved.
