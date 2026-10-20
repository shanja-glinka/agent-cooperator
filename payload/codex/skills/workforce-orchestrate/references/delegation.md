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
{{#reviewBlock}}
│ submitted blocks ready together → one Sol xhigh review           │
│   real findings → the same worker → the same reviewer checks     │
│   the fixes and what they touch → next round or accept           │
{{/reviewBlock}}
{{^reviewBlock}}
│ submitted → you read the whole diff → real findings → the same   │
│   worker → you check the fixes → accept                          │
{{/reviewBlock}}
│ audit lens: only for an area nothing else covers (step 6)        │
└──────────────────────────────────────────────────────────────────┘
  │
  ▼
{{#reviewStage}}
Stage acceptance (pipeline, when blocks interact) → required checks → report
{{/reviewStage}}
{{^reviewStage}}
Required checks passed → report (stage review is off in this install)
{{/reviewStage}}
```

## Steps

1. **Profile.** Reuse an explicit choice, native launch profile, or standing
   preference; otherwise Economy: you on Sol, workers and probes on Luna{{#reviewBlock}},
   the reviewer on Sol at xhigh{{/reviewBlock}}. Enhanced (Astra cooperator) for substantial
   unresolved design, Standard (Sol workers) on the user's choice; say which
   applies. Ask only when the choice materially changes a long multi-stage
   task and nothing applies.
2. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs and what you already found, WRITE_SET,
   CHECKS with cwd and the expected result, PROJECT_RULES (every applicable
   rule file), and CONSTRAINTS: what the project will check on this change (CI
   steps, lint and size rules, frozen areas), each with the file that sets it,
   found in the project before you brief. A light worker gets what it needs to
   work alone, not your conclusions to copy. Tell it to keep in its context
   what the next decision needs: long output goes to a file and is read where
   it matters, code is read by the functions it changes and the conditions
   they depend on. Start a fresh worker for the rest of a block only when that
   is cheaper than the knowledge it would have to rebuild. Decide open design
   questions before briefing. Set model and reasoning effort on every spawn;
   spawn with an empty fork and the packet. Independent blocks launch in one
   turn. In a pipeline, keep the OPEN list in the task state file and reread
   it after compaction or resume.
3. **Hold the budget and escalate with a handoff.** Each worker tier has a
   budget per block in dispatch: three attempts and a volume (tool calls,
   tokens). An attempt is spent only by a run that ends without a result: the
   worker hit its BUDGET, returned `STATUS: handoff`, or its fix left the
   finding open. A submitted block, or a fix that closes its finding, spends
   no attempt; its tool calls and tokens still count. Put the per-run BUDGET
   in the packet. Within budget, continuations and fixes go to the same
   worker. If a run stops without a packet, ask it for its HANDOFF and nothing
   else. When the third attempt is spent or the volume runs out, the block
   moves up the ladder. Treat that as evidence that the block is hard: read
   the HANDOFF, find the cause (missing access or environment, a wrong or thin
   brief, or a block beyond the model), fix what a stronger model would not
   fix, and write APPROACH. The stronger worker is a new spawn with the
   original packet, APPROACH, and the HANDOFF only. At the top of the ladder
   the next move is yours: re-plan or ask the user.
4. **While agents work.** Wait with `wait_agent`; never `sleep` or poll,
   because every wake-up rereads your context. A worker's packet is its
   report; it sends no progress messages. Act at once on a blocker, a contract
   question, a submitted block, a failed run, or a spent budget. Blocks
   submitted together are accepted together.
5. **Accept the block.**
{{#reviewBlock}}
   The reviewer (`workforce_reviewer` on GPT-6.1 Sol at xhigh, MODE=block)
   gets the packet with `REVIEW: acceptance of a light worker's block`, or
   `required (<rule or request>)`, or `question (<what is in doubt>)`, the
   snapshot, what is already fixed, and which checks already ran; blocks
   ready together go to one review. Before taking a finding, open the code and
   the rule it cites: it is real when it is in the diff or caused by it and
   reproduces by a check or a concrete scenario; suggestions, hypothetical
   inputs, and work outside SCOPE are not taken. Real findings go to their
   workers as one bundle each; then continue the same reviewer with
   `followup_task` and the delta, so it checks the fixes and what they touch
   without rereading everything. The same finding twice without progress
   stops the loop for your decision. A reviewer's "accepted" does not replace
   a required check that has not passed. A small local change with a clear
   contract and passing checks you may accept on your own reading of the
   diff.
{{/reviewBlock}}
{{^reviewBlock}}
   Block review is off in this install. Read the whole diff yourself and take
   the defects you find to the same worker as one bundle; check its fixes
   yourself. A review that the project, the user, or the task requires still
   runs, as dispatch describes.
{{/reviewBlock}}
6. **Audit lenses on demand.** No lens runs by default. Add one (docs, task,
   or conventions; dispatch has the model) only for an area that the checks
   {{#reviewBlock}}and the review {{/reviewBlock}}do not cover, and give it that area, the snapshot, the
   FILES, a BUDGET, and PROJECT_RULES. It reports FINDINGS with `file:line`
   and the quoted rule, NOTES, and its coverage; its round ends only on
   `STATUS: complete`, and a partial one is continued with `followup_task`,
   not replaced. Judge its findings as in step 5; NOTES never go to the
   worker. A lens with nothing real is retired for the block; one with real
   findings may check the fix.
7. **Accept the stage.**
{{#reviewStage}}
   In a pipeline whose blocks interact in ways no block acceptance saw, a
   separate stage reviewer (dispatch) checks the original outcome,
   cross-boundary paths, and the project's required gates.
{{/reviewStage}}
{{^reviewStage}}
   Stage review is off in this install: when the blocks are accepted and the
   project's required checks pass on the whole change, report.
{{/reviewStage}}
8. **Report** also: submitted → accepted per block{{#reviewBlock}}, the `REVIEW:` line{{/reviewBlock}},
   audit lenses you added and what each covered, escalations with their
   cause, and actual routing when it differed from the plan.

## Situations

| Situation | Next move |
| --- | --- |
| A block is submitted, but its worker's budget is spent | Verify it as it is. A later fix goes to the next tier; never redo the block only to change tiers. |
| Work is left and the worker's budget is spent | Get the HANDOFF, find the cause, restore what is missing (a dependency, a database, a design decision), write APPROACH, then start the next tier. |
| A CI or project check fails on a limit the brief did not name | Name the limit and its source in the bundle to the worker, and in later briefs. |
{{#reviewBlock}}
| The reviewer brings the same finding again | Stop the loop: read the code and the finding yourself, then decide (accept with a reason, fix the packet, or escalate). |
| Sol is unavailable for the review | Review on Astra high, mark it as the fallback, and say so in the report. |
| The reviewer accepts, but a required check is missing or stale | Not accepted yet: get that check and send it to the same reviewer. |
{{/reviewBlock}}
| Findings for block A arrive while A's worker is on block B | Keep them under A and send them when that worker finishes its current step, never as a second assignment at once. |
| The next block may change what an acceptance reads | Use a snapshot ([tools](tools.md)) or wait for the writer. Disjoint WRITE_SETs do not freeze imports. |

## Examples

**two blocks, one acceptance.** Two Luna workers at xhigh own `src/a` and
`src/b`; both briefs name the CI's file-size check (`scripts/check-size.cjs`,
3000 lines). Both submit close together{{#reviewBlock}}: one Sol review reads both diffs,
finds one real defect in `src/b`, its worker fixes it, and the same reviewer
checks the fix. `REVIEW: rounds=2 findings=1 real=1`{{/reviewBlock}}{{^reviewBlock}}: you read both diffs,
find one real defect in `src/b`, its worker fixes it, and you check the fix{{/reviewBlock}}.

**escalation.** Block "rewrite the date parser". The Luna worker returns
`STATUS: handoff` at its 600-call budget twice (two attempts), and the third
run ends without a submitted block (the third). Its HANDOFF says 14 of 19
cases pass with a regex approach and the five failures are mixed time zones.
You decide the regex route is the problem, write APPROACH: "replace the regex
with a token scanner; keep the 14 passing tests green", and spawn a fresh
worker on Sol xhigh with the original packet, APPROACH, and the HANDOFF.

## Why

A light worker's token costs a small fraction of the cooperator's, so the
expensive part of a delegated task is what surrounds the work. In the
2026-10-20 measurement of v6 the Luna workers did the work for 7% of the
price, while the Sol cooperator took 62%, the reviewer 24%, and three default
audit lenses 6%; every report wakes the cooperator, and every wake-up rereads
its context. So audits run only where they cover something, blocks that are
ready together share one acceptance, workers send no progress, and the
cooperator waits instead of polling. Cheap work still needs a strong check:
the reviewer found real defects in light workers' results in 3 of 6 large
tasks. Constraints found only when CI failed made workers redo blocks, so the
brief names them with their source. The same worker and reviewer continue
across rounds because a round then costs only the delta. A block that
exhausts a tier is a signal about the block, so the next tier gets your
analysis and a handoff instead of a pile of transcripts. Only a run that fails
spends an attempt, because a fix that lands is progress.
