# Delegation (Codex)

Read this in full before your first agent; the orchestration skill says which
work goes to whom. [dispatch](dispatch.md) holds the models, efforts, budgets,
and the work packet; [tools](tools.md) shows the real spawn, follow-up, and
wait calls. Product code in a delegated block is written by its worker.

## Flow

```text
┌─ per block ──────────────────────────────────────────────────────┐
│ probe (when a fact is missing)  →  worker (block)  →  submitted  │
│                                                                  │
│ worker stuck (3 attempts without a result, or volume spent)      │
│   → HANDOFF → you find the cause and decide the approach →       │
│   next tier gets packet + APPROACH + HANDOFF only (dispatch)     │
│                                                                  │
│ on submit you choose:                                            │
│   a) audit and review this block now                             │
│   c) next block to the worker  →  audit and review in parallel   │
│                                   on 1, 2, 3 or N submitted      │
│                                                                  │
│ audit game (per lens): round 1 runs every lens; a round ends     │
│   only on STATUS: complete; partial → continue the same auditor  │
│   you take only real findings → same worker                      │
│   real findings → that lens won, only winners play the next round│
│   nothing real  → that lens lost, retired for this block         │
│   every lens lost, or round 3 → audit over                       │
│                                                                  │
│ review: Sol xhigh reads the whole diff → real findings → same    │
│   worker → same reviewer checks the delta → next round or accept │
└──────────────────────────────────────────────────────────────────┘
  │
  ▼
Stage acceptance (pipeline only) → required checks passed → report
```

## Steps

1. **Profile.** Reuse an explicit choice, native launch profile, or standing
   preference; otherwise Economy: you on Sol, workers, probes, and auditors on
   Luna, the reviewer on Sol at xhigh. Enhanced (Astra cooperator) for
   substantial unresolved design, Standard (Sol workers) on the user's choice;
   say which applies. Ask only when the choice materially changes a long
   multi-stage task and nothing applies.
2. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs and what you already found, WRITE_SET,
   CHECKS with cwd and the expected result, PROJECT_RULES (every applicable
   rule file), and the traps you saw. A light worker gets what it needs to
   work alone, not your conclusions to copy: the goal, the boundaries, the
   sources, and how to check. Decide open design questions before briefing.
   Set model and reasoning effort on every spawn; spawn with an empty fork and
   the packet. Independent blocks launch in one turn; wait for agents with
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
   a reason to push the same worker again: read the HANDOFF, find the cause
   (missing access or environment, a wrong or thin brief, or a block beyond
   the model), and fix what a stronger model would not fix: a missing
   dependency, a wrong packet, an undecided design. Then decide whether the
   next tier continues the same path, takes a different route, or whether the
   block needs splitting or re-scoping. Write that as APPROACH. The stronger
   worker is a new spawn with the original packet, APPROACH, and the HANDOFF
   only; earlier reports, audit rounds, and transcripts stay with you. At the
   top of the ladder the next move is yours: re-plan or ask the user.
4. **Choose what happens next** when a block is submitted (a or c above).
   Audit and review in parallel with the next block only when that block does
   not change what they read: the submitted block's files and what they
   import. The WRITE_SETs tell you; otherwise audit a snapshot or wait.
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
   Round 1 runs every lens; after that only winners play: a lens with at least
   one real finding continues to the next round with what was accepted and
   rejected, and a lens with nothing real has lost and is retired for this
   block. The audit ends when every lens has lost, or after round 3; real
   findings not yet fixed still go to the worker.
6. **Review.** The reviewer (`workforce_reviewer` on GPT-6.1 Sol at xhigh,
   MODE=block) gets the packet with `REVIEW: acceptance of a light worker's
   block`, or `required (<rule or request>)`, or `question (<what is in
   doubt>)`, the snapshot, the audit log, what is already fixed, and which
   checks already ran, and reads the whole diff. Judge its findings like audit
   findings. Real ones go to the same worker as one bundle; then continue the
   same reviewer with `followup_task` and the delta, so it checks the fixes
   and what they touch without rereading everything. Keep its findings list
   across rounds. A round that brings a new real defect is progress; the same
   finding twice without progress stops the loop for your decision. A
   reviewer's "accepted" does not replace a required check that has not
   passed. Read the diff yourself as well; you are the one who accepts.
7. **Accept the stage** (pipeline only, when blocks interact in ways no block
   review saw): a separate stage reviewer (dispatch) checks the original
   outcome, cross-boundary paths, and the project's required gates.
8. **Report** also: submitted → audited → reviewed → accepted per block, the
   `REVIEW:` line, the audit score, escalations with their cause, and actual
   routing when it differed from the plan.

## Situations

| Situation | Next move |
| --- | --- |
| A block is submitted, but its worker's budget is spent | Verify it as it is. A later fix goes to the next tier; never redo the block only to change tiers. |
| Work is left and the worker's budget is spent | Get the HANDOFF, find the cause, restore what is missing (a dependency, a database, a design decision), write APPROACH, then start the next tier. |
| The reviewer brings the same finding again | Stop the loop: read the code and the finding yourself, then decide (accept with a reason, fix the packet, or escalate). |
| Sol is unavailable for the review | Review on Astra high, mark it as the fallback, and say so in the report. |
| An auditor is partial and at its token ceiling | Hand only NOT_REACHED to the next audit tier on the same snapshot, lens, and round; keep its findings. |
| Every lens lost, or round 3 is over | The audit game ends. Accepted findings not yet fixed stay open: the worker fixes them and the review covers the fix. |
| The reviewer accepts, but a required check is missing or stale | Not accepted yet: get that check and send it to the same reviewer. |
| Findings for block A arrive while A's worker is on block B | Keep them under A and send them when that worker finishes its current step, never as a second assignment at once. |
| The next block may change what an audit or review reads | Use a snapshot ([tools](tools.md)) or wait for the writer. Disjoint WRITE_SETs do not freeze imports. |

## Examples

**review loop.** One Luna worker at xhigh with WRITE_SET `src/export.js,
test/export.spec.js, CHANGELOG.md`. Submitted. Three Luna auditors: round 1
brings 2 real findings (docs: missing changelog line; conventions: test file
misnamed against a project rule) and 3 not real; the task lens lost. The
worker fixes the 2; round 2 runs docs and conventions, nothing real. The Sol
review finds that page size 0 loops forever; the worker adds the guard and a
test; the same reviewer checks the delta: accepted. `REVIEW: rounds=2
findings=1 real=1`.

**escalation.** Block "rewrite the date parser". The Luna worker returns
`STATUS: handoff` at its 600-call budget twice (two attempts), and the third
run ends without a submitted block (the third). Its HANDOFF says 14 of 19
cases pass with a regex approach and the five failures are mixed time zones.
You decide the regex route is the problem, write APPROACH: "replace the regex
with a token scanner; keep the 14 passing tests green", and spawn a fresh
worker on Sol xhigh with the original packet, APPROACH, and the HANDOFF.

**pipeline.** "Move the resolver to the generated DTO and switch consumers."
Plan of four blocks. Workers A and B run in parallel; when A is submitted you
start block C with A's worker and audit and review A and B together while C
runs, because C writes nothing A or B import. Stage acceptance on Astra after
the last block.

## Why

A light worker's token costs a small fraction of the cooperator's (GPT-6 Luna
1/20 of GPT-6.1 Sol, cached input 1/10), so the cooperator's own long reading
and typing is the expensive part of a task, and delegating pays when the brief
and the acceptance cost less than the work. Delegating to a worker on the same
price tier as the cooperator only adds requests (2026-10-19: a Sol worker and
a Sol reviewer on a small fix took 2.6 times the requests of Sol alone).
Cheap work needs a strong check: in the user's practice the reviewer catches
real defects in light workers' results again and again, and the fix goes back
for a second round or more. The same worker and auditors continue across
rounds because a round then costs only the delta, and only winning lenses
continue because a lens that found nothing real on a block rarely finds
something real in the fix that answers other lenses. Auditors report
everything because a reporter told to be selective reports less; the
filtering is your job. A block that exhausts a tier is a signal about the
block, so the next tier gets your analysis and a handoff instead of a pile of
transcripts. Only a run that fails spends an attempt, because a fix that lands
is progress.
