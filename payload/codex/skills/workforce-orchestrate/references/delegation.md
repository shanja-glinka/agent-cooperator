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
│ submitted blocks ready together → snapshot → one Sol xhigh       │
│   review of the CONTRACT on the touched paths                    │
│   real findings → the same worker → the same reviewer checks     │
│   the fixes and what they touch → next round or accept           │
│   accepted_if <check> → accept.mjs closes it on the same tree    │
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
Stage review (Sol xhigh), only for an integration part no block review
covered → required checks → report
{{/reviewStage}}
{{^reviewStage}}
Required checks passed → report (stage review is off in this install)
{{/reviewStage}}
```

## Steps

1. **Profile.** Reuse an explicit choice, native launch profile, or standing
   preference; otherwise Economy: you on Sol, workers and probes on Luna{{#reviewBlock}},
   the reviewer on Sol at xhigh{{/reviewBlock}}. Standard (Sol workers) on the user's
   choice; a stored choice of Enhanced, removed in policy 1.12.0, runs as
   Standard. Say which applies. Ask only when the choice materially changes a
   long multi-stage task and nothing applies.
2. **Brief.** Fill the packet from dispatch: outcome, acceptance example,
   SCOPE and OUT_OF_SCOPE, exact inputs and what you already found, WRITE_SET,
   CHECKS with cwd and the expected result, PROJECT_RULES (every applicable
   rule file), CONTRACT (what the change must keep, quoted with its source),
   and CONSTRAINTS. Before you send the brief, the constraints of the touched
   areas that can change how the work is done are in it, with their source: a
   rule for the whole block once, with its scope (the format check and the
   files it covers); the limit of one large file separately, with its current
   value. A constraint you hold and that is current needs no new search; one
   you lack, look up with one targeted search, and a substantial question
   still open after it becomes the worker's first step, before any edit that
   depends on it. One owner finds each constraint. You decide architecture,
   block boundaries, and how blocks interact; the light worker keeps bounded
   search, reproduction, the local way to implement, and testing its
   hypotheses. It gets what it needs to work alone, not your conclusions to
   copy. Tell it to keep in its context
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
4. **While agents work.** Wait with `wait_agent` and no short timeout; the
   launch layers set its minimum and default to 20 minutes, and it returns at
   once on an agent's message or finish. Never `sleep` or poll, because every
   wake-up rereads your context: without a new substantial event, do not look
   at the workers' files, `git diff` or `status`, or `list_agents`, and do not
   write a repeated status; after an event, do what it needs. A worker's
   packet is its report; it sends no progress messages. Act at once on a
   blocker, a contract question, a submitted block, a failed run, or a spent
   budget. Blocks submitted together are accepted together.
5. **Accept the block.**
{{#reviewBlock}}
   The reviewer (`workforce_reviewer` on GPT-6.1 Sol at xhigh, MODE=block)
   gets the packet with `REVIEW: acceptance of a light worker's block`, or
   `required (<rule or request>)`, or `question (<what is in doubt>)`, the
   CONTRACT, SNAPSHOT `tree:<hash>` from `accept.mjs snapshot`, what is
   already fixed, and which checks already ran on which tree; blocks ready
   together go to one review. It checks the CONTRACT on the touched paths: the
   changed protective sites it lists from the diff, each kept, violated, or
   not established, and the other requirements. Before taking a finding, open
   the code and the rule it cites: it is real when it is in the diff or
   caused by it and contradicts the CONTRACT or a rule, or reproduces by a
   check or a concrete scenario; a change that breaks an explicit requirement
   needs no proof that the bad input already occurred. Suggestions and work
   outside SCOPE are not taken. Real findings go to their workers as one
   bundle each; then continue the same reviewer with `followup_task` and the
   delta, so it checks the fixes and what they touch without rereading
   everything. The same finding twice without progress stops the loop for
   your decision. A reviewer's "accepted" does not replace a required check
   that has not passed: when only that check is left, the reviewer ends with
   `accepted_if <check> on tree:<hash>`, and you close it with `accept.mjs
   close` once a recorded run passed on that tree (tools); no reviewer call is
   needed to read an exit code. If the fix for a failed check changes code,
   that delta goes to the same reviewer. A small local change with a clear
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
   A stage review (`workforce_reviewer` on Sol at xhigh, MODE=stage) runs only
   for an integration part no block review covered: blocks that interact
   (a format one block produces and another reads), your own integration
   edits, a shared contract. It checks the original outcome on those paths and
   the project's required gates. When one review already read the final
   merged diff and those interactions, it closes both duties; do not repeat
   it under another name.
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
| Sol is unavailable for a review that must run | The block is not independently reviewed: say so and ask the user. Your own reading is not an independent review, and no other model stands in for Sol. |
| The reviewer accepts, but a required check is missing or stale | `accepted_if <check> on tree:<hash>`: run the check through `accept.mjs` and close it; no new review round unless the code changed in a way that bears on the review. |
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
brief names them with their source. In the v7 measurement the brief left out
the file-size limit in four of six large tasks, the reviewer missed a fallback
change that broke a database constraint in one of three, and the cooperator
woke 72 times on one-minute waits, mostly to write a status or look at the
workers' files; so the constraints of the touched areas are in the brief
before the work starts, the review checks the contract site by site, a check
that passed on the reviewed tree closes its condition without a new round,
and the wait is long. The same worker and reviewer continue
across rounds because a round then costs only the delta. A block that
exhausts a tier is a signal about the block, so the next tier gets your
analysis and a handoff instead of a pile of transcripts. Only a run that fails
spends an attempt, because a fix that lands is progress.
