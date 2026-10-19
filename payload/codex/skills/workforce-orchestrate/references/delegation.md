# Delegation (Codex)

Read this in full before your first worker, auditor, or reviewer; the orchestration skill says when
an agent is worth it. [dispatch](dispatch.md) holds the models, efforts,
budgets, and the work packet; [tools](tools.md) shows the real spawn,
follow-up, and wait calls. Product code in a delegated block is written by its
worker.

## Flow

```text
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
│ review (independence rule) → real findings → same worker         │
└──────────────────────────────────────────────────────────────────┘
  │
  ▼
Stage acceptance (pipeline only) → required checks passed → report
```

## Steps

1. **Profile.** Reuse an explicit choice, native launch profile, or standing
   preference; otherwise Standard for a described solution, Enhanced for
   substantial unresolved design. Economy (Luna workers) runs only when the
   user chose it. Ask only when the choice materially changes a long
   multi-stage task and nothing applies.
2. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs and what you already found, WRITE_SET,
   CHECKS with cwd, PROJECT_RULES (every applicable rule file). Decide open
   design questions before briefing. Set model and reasoning effort on every
   spawn. Independent blocks launch in one turn; wait for agents with
   `wait_agent`, never with `sleep`. In a pipeline, keep the OPEN list in the
   task state file and reread it after compaction or resume.
3. **Hold the budget and escalate with a handoff.** Each worker tier has a
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
4. **Choose what happens next** when a block is submitted (a, b, or c above).
   Each check needs its own reason, not the work class: audit a lens when the
   change can break a rule of that lens that you have not checked yourself,
   or for a named open question under the independence rule. Checks the
   project requires always run. In (c), audit in parallel only when the next
   block does not change what the audit reads: the audited block's files and
   what they import. The WRITE_SETs tell you; otherwise audit a snapshot or
   wait.
5. **Run the audit game.** Auditors (model and effort per dispatch) get one
   lens each, the frozen snapshot, the list of assigned FILES, a BUDGET, and
   PROJECT_RULES, and report FINDINGS with `file:line` and the quoted rule or
   document line, NOTES, and their coverage. A lens's round is done only when
   its auditor returns `STATUS: complete`. On `STATUS: partial`, or a run that
   stopped without a packet, continue the same auditor with `followup_task`:
   first "return your packet and NOT_REACHED" if there was none, then
   "continue with NOT_REACHED". Never spawn a fresh auditor of that lens for
   the block while the old one can be continued, and send nothing to the
   worker until every lens in the round is complete. Judge only FINDINGS;
   NOTES never go to the worker. Before accepting a finding, open the quoted
   rule and the cited line yourself: it is real when it is in the diff or
   caused by it, breaks the quoted rule, document line, or acceptance line at
   that line, and reproduces by a check or a concrete scenario. Theoretical
   risks, hypothetical inputs, work outside SCOPE, and taste without a quoted
   rule are not taken. Real findings go to the same worker as one bundle.
   Round 1 runs every chosen lens; after that only winners play: a lens with
   at least one real finding continues to the next round with what was
   accepted and rejected, and a lens with nothing real has lost and is
   retired for this block, even while other lenses play on. Do not re-run a
   retired lens to double-check; you read the whole delegated diff, fixes
   included. The audit ends when every lens has lost, or after round 3; real
   findings not yet fixed still go to the worker.
6. **Review.** Read the diff of delegated work yourself. Add an independent
   reviewer (model per dispatch) only under the independence rule, and put it
   in the packet: `INDEPENDENCE: required (<the rule or request>)`, and the
   reviewer reads the whole diff, fixes included, with the audit log; or
   `INDEPENDENCE: optional (QUESTION: property; place; evidence so far; what
   it does not answer)`, and the reviewer answers that question first. Tell
   it what is already fixed and which checks already ran. Take the real
   findings to the same worker and re-review the delta with the same
   reviewer. A reviewer's "accepted" does not replace a required check that
   has not passed.
7. **Accept the stage** (pipeline only, when blocks interact in ways no block
   review saw): a separate stage reviewer (dispatch) checks the original
   outcome, cross-boundary paths, and the project's required gates.
8. **Report** also: submitted → block reviewed → stage accepted, audit score
   per block, escalations with their reason, and actual routing when it
   differed from the plan.

## Situations

| Situation | Next move |
| --- | --- |
| A block is submitted, but its worker's budget is spent | Verify it as it is. A later fix goes to the next tier; never redo the block only to change tiers. |
| Work is left and the worker's budget is spent | Get the HANDOFF, find the cause, restore what is missing (a dependency, a database, a design decision), write APPROACH, then start the next tier. |
| An auditor is partial and at its token ceiling | Hand only NOT_REACHED to the next audit tier on the same snapshot, lens, and round; keep its findings. |
| Every lens lost, or round 3 is over | The audit game ends. Accepted findings not yet fixed stay open: the worker fixes them and your reading of the diff, or the review, covers the fix. |
| The reviewer accepts, but a required check is missing or stale | Not accepted yet: get that check and send it to the same reviewer. |
| Findings for block A arrive while A's worker is on block B | Keep them under A and send them when that worker finishes its current step, never as a second assignment at once. |
| The next block may change what an audit reads | Audit a snapshot ([tools](tools.md)) or wait for the writer. Disjoint WRITE_SETs do not freeze imports. |

## Examples

**audit game.** The user asked for an audited block. One worker on GPT-6.1
Sol xhigh with WRITE_SET `src/export.js, test/export.spec.js, CHANGELOG.md`.
Submitted. You choose (a): three auditors on Luna. Round 1: 5 findings, 2 real
(docs: missing changelog line; conventions: test file misnamed against a
project rule), 3 not real (task: hardening of an input the report never
mentioned). The task lens lost and is retired. The worker fixes the 2 (no
attempt spent: both closed). Round 2 runs only docs and conventions: nothing
real, both lost. The project's test command passes. Done.

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

An agent's fresh context pays off only when the work would not fit in yours
or splits into parts that each need their own; otherwise it rebuilds what you
already know, and every agent and check round adds its own requests. On a
known 49-file change a team made two to four times the model requests of one
session, and on a bug known only by its symptom, handing the investigation to
a worker and adding a reviewer took 51 and 61 requests against 16–17 for the
same result (both 2026-10-19). The same worker and auditors continue across
rounds because a round then costs only the delta, and only winning lenses
continue because a lens that found nothing real on a block rarely finds
something real in the fix that answers other lenses. Auditors report
everything because a reporter told to be selective reports less; the
filtering is your job. A block that exhausts a tier is a signal about the
block, so the next tier gets your analysis and a handoff instead of a pile of
transcripts. Only a run that fails spends an attempt, because a fix that lands
is progress.
