---
name: workforce-orchestrate
description: "Cooperator-led implementation, refactoring and automation in Codex. Classify direct/build/pipeline, route by open obligations and current evidence, brief workers and accept the verified result."
---

# Workforce orchestration

You are the cooperator in the user's session: decide the approach, brief agents,
judge evidence, integrate and accept. Workers write product code except in
`direct` work. Read applicable repository instructions; they override this kit.
Give each agent the applicable PROJECT_RULES and use the real calls in
[tools](references/tools.md). [Dispatch](references/dispatch.md) holds model
routing, budgets and the packet.

## Route Decision

At classification and after a result, finding, blocker or budget event, choose
the allowed next action with the lowest expected total cost of reaching the
agreed, verified and delivered outcome:

`a* = argmin(a in A_allowed(s)) [C_step(s, a) + E(V*(s_next) | s, a)]`

Include routing, all agents, checks, handoffs and recovery. Use grounded qualitative comparisons; do not invent
probabilities, token counts or a numeric continuation cost.
Apply permissions, explicit user constraints and applicable mandatory rules
first; then check what remains to finish; then compare useful continuations.
An optional skill is a candidate; a required skill remains a requirement.
Reuse current evidence; read or repeat a check when its answer can change the
next action, verification or delivery. New dependencies may add obligations.

For build/pipeline work, keep one durable task record in the existing task
state file/store; otherwise choose a permitted file outside tracked project
files and record its location in TASK. The cooperator alone updates it at
decision boundaries and reloads it after resume or compaction. Keep the outcome,
current snapshot and evidence, OPEN obligations with owner and closure evidence,
next action with its reason, and budgets/queued work by block and tier.
An obligation closes only with evidence of completion or a sourced reason it
does not apply. Handoff, a new worker, submission, an audit cap or a blocker
never closes it. Reuse evidence only while its source, scope and relevant
environment/dependencies remain applicable; invalidate only affected conclusions.

### Coinciding conditions

| Observed state | Next move |
| --- | --- |
| Block submitted; worker budget exhausted | Preserve the result and verify it. New implementation/fixes require an allowed next tier or re-plan, not reimplementation just to escalate. |
| Necessary work remains; worker budget exhausted | Obtain HANDOFF, diagnose the cause and choose APPROACH; restore missing prerequisites before launching the next tier. Preserve spent runs and usage. |
| Known external blocker unchanged | Do bounded permitted recovery or obtain the missing prerequisite. If external intervention is needed, record BLOCKED and the exact next external action; do not repeat the same blocked operation. |
| Auditor partial; its token ceiling reached | Transfer only NOT_REACHED to the next audit tier on the same snapshot/lens/round; retain findings and completed coverage. Ordinary partial runs continue the same auditor. |
| All lenses retired, or round 3 ended | End the audit game. Keep real findings open for fixes and review; the round cap is not acceptance. |
| Reviewer accepts but a mandatory check is missing or stale | Keep acceptance pending; obtain the affected evidence and return it to the same reviewer. |
| Findings for A arrive while its worker owns B | Queue them under A; switch at a safe boundary with A's packet, WRITE_SET and budget. Never give one worker simultaneous conflicting write assignments. |
| Parallel work may change an audit's read dependencies | Use an actual stable snapshot or serialize the writer. Disjoint WRITE_SETs alone do not freeze reads. |
| Result and required obligations confirmed; delivery remains | Deliver the agreed result and limitations, then record DONE and stop. Reopen only for a new material fact. |

BLOCKED and BUDGET_STOP are unfinished task states, not successful delivery.
If no allowed continuation fits the remaining budget, preserve OPEN and state
BUDGET_STOP with the needed re-plan or budget decision. Do not weaken GOAL,
discard obligations or reset accounting to create a cheaper completion.

## Execute

1. **Classify.** `direct`: question, analysis, config/doc edit or trivial fix;
   do it inline without agents. `build`: one known-shape block.
   `pipeline`: multiple stages or open design, with owned blocks.
   Analysis-only work ends with analysis.
2. **Select the profile.** Reuse an explicit choice, native launch profile or standing
   preference; otherwise Standard for a described solution, Enhanced for
   substantial unresolved design. Economy requires the user's choice. Ask only
   when an unresolved long task has a material resource/approach choice and no
   applicable preference. Explicit model, effort and budget constraints bind.
3. **Brief.** Fill the dispatch packet with outcome, acceptance, scope, exact
   inputs, PROJECT_RULES, WRITE_SET and CHECKS with cwd. Resolve cross-owner
   design before assigning implementation. Set model and effort on every spawn.
   Independent blocks may run together only with stable inputs and ownership.
4. **Budget and handoff.** Follow dispatch's per-block/tier accounting.
   Continue the same worker within budget, including fixes after submission.
   At exhaustion, obtain HANDOFF; a packet-only recovery asks for no new work.
   Read it and write APPROACH: continue, change technique, split or re-plan
   while preserving the original obligations and spent budget. The fresh next
   tier receives the original assignment, current snapshot, APPROACH and
   HANDOFF only; keep old transcripts and audit history with you.
5. **Choose verification.** On submission choose audit, skip audit, or begin
   independent next work with audit in parallel. Audit substantial blocks,
   refactors, sensitive paths and affected docs/conventions when warranted.
   Honor required project checks; do not add every available procedure.
   A frozen snapshot is a stable checkout or copied tree including relevant
   dirty/new files and read dependencies, identified in the packet. Materialize
   it while writers are paused and point readers at it, or serialize the work;
   a revision label alone is insufficient. Check later integration separately.
6. **Audit.** Give each auditor one lens, SNAPSHOT, FILES, BUDGET and
   PROJECT_RULES. Each chosen lens's round ends only on `STATUS: complete`
   with all assigned files read. On partial, recover the packet if necessary,
   then continue NOT_REACHED with the same auditor unless its tier is exhausted.
   Send one finding bundle only after every lens in that round is complete.
   Judge FINDINGS, never NOTES: open the quoted rule and cited line yourself;
   accept a diff-caused in-scope violation supported by a check or concrete
   scenario. Reject unsupported risks, unrelated scope and taste without a rule.
   Round 1 runs every chosen lens; only lenses with real findings continue,
   at most three rounds. Retired lenses stay retired. Fix accepted findings
   with the budget-eligible owner; independent review covers the corrected diff.
7. **Review and accept.** Use an independent block reviewer for warranted or
   required review; it reads the whole relevant diff, including new regressions
   in previously audited areas. Same reviewer rechecks correction deltas.
   Pipeline stage acceptance uses a separate reviewer against the original
   outcome, cross-boundary paths and required gates. A report or `no_findings`
   never substitutes for missing evidence or closes an OPEN obligation.
8. **Deliver.** Report outcome, actual checks and gaps, block/stage status,
   significant routing changes and their reasons, and the available usage.
   Apply the delivery transition above. Commit, push, merge, deployment and
   messages to third parties require the user's task authorization.

## Examples

- **Direct:** fix a README typo inline; no team or separate state file.
- **Build:** one owned bug fix, affected checks, then warranted independent
  verification. A passed check is reused until a relevant premise changes.
- **Pipeline:** independent A/B blocks may run together; audit their stable
  snapshots while C runs. Queue any A fixes under A and restore its assignment
  before its worker switches back; accept the integrated stage after its gates.
