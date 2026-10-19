# Routing and the work packet (Codex)

`{{CODEX_HOME}}/codex-workforce/profiles.json` is the routing record; this file
explains it. A model release updates the record, not the workflow.

## Presets

| Role | Standard | Enhanced | Economy |
| --- | --- | --- | --- |
| Cooperator (user-facing session) | `gpt-6.1-sol`, high | `gpt-6-astra`, high | `gpt-6.1-sol`, high |
| Probe (`workforce_probe`) | `gpt-6-luna`, medium; `gpt-6.1-sol` when judgment is needed | same | same |
| Worker (`workforce_worker`) | `gpt-6.1-sol`, xhigh | `gpt-6.1-sol`, xhigh | `gpt-6-luna`, xhigh |
| Worker ladder | Sol → Astra | Sol → Astra | Luna → Sol → Astra |
| Auditor (`workforce_auditor`) | `gpt-6-luna`, xhigh | same | same |
| Block reviewer (`workforce_reviewer`, MODE=block) | `gpt-6.1-sol`, high | same | same |
| Stage reviewer (`workforce_reviewer`, MODE=stage) | `gpt-6-astra`, high | same | same |
| Unresolved design | targeted Astra help | bounded Astra high block | the cooperator decides before briefing |

Presets are starting recommendations. A named profile is an approach preference;
the user's explicit model, effort, and budget limits are binding. Economy is
chosen only by the user, explicitly or as a standing preference. The native
launch layers `codex -p workforce-standard`, `codex -p workforce-enhanced`, and
`codex -p workforce-economy` set
the cooperator's model and effort for that launch; a prompt never changes the
running model, so report a mismatch instead of claiming one.

Models as checked on 2026-10-08: GPT-6 Astra $10/$50 per MTok in/out, GPT-6.1 Sol
$2/$10 (near-Astra on complex work), GPT-6 Luna $0.1/$0.5 (effort up to xhigh).
Role files omit model and effort on purpose: the spawn sets them. Sol and Luna
default to medium, so set effort on every spawn: workers run at xhigh.

## Selection

1. Explicit choice, native launch profile, active task choice, or standing
   preference wins; the latest instruction takes precedence.
2. "Work autonomously", "choose yourself", and unattended runs delegate the
   choice: Standard for a described solution, Enhanced for substantial
   unresolved design.
3. Concrete work and small fixes use Standard without a question.
4. Ask once, in the user's language, only before long multi-stage work where
   the choice materially changes the approach and nothing above applies.

Keep PROFILE, its source, and WORK_CLASS in the task state; agents inherit them
and never ask the user.

## Escalation and budgets

Worker budgets per block, counted by the cooperator:

| Tier | Per run (BUDGET) | Runs | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| Luna | 600 tool calls | 3 | 400k | Sol xhigh |
| Sol | none | 3 | 500k | Astra high |
| Astra | none | 3 | none | the cooperator re-plans or asks the user |

Count each implementation start or continuation, including post-submit fixes,
as one run under the same block and tier. A HANDOFF-only request asks for no
implementation and adds no work run, but its known usage still counts. Keep
counters when blocked, submitted, handed off or switched to another block.
Queue late findings under their original block; restore its packet and counters
before the worker returns to it.

Sum only confirmed, non-overlapping usage attributable to this block/tier/run.
Partial usage is a measured lower bound; unavailable usage is unknown, not zero.
Cumulative session totals need a valid starting baseline before they can be used
as run totals. Retain run counts when usage is unavailable and disclose that
exact token-ceiling compliance cannot be established. Token and tool-call
budgets here are instructions, not runtime guards.

At exhaustion, preserve and verify an already submitted result. If implementation
remains, diagnose the cause, restore prerequisites and launch the next allowed
tier with the original assignment, current snapshot, APPROACH and HANDOFF only.
The cooperator retains earlier transcripts, findings and accounting; current
unclosed obligations and their closure conditions must survive in HANDOFF.
Re-planning does not reset spent budget or drop the original outcome.

Astra high is the ordinary worker-ladder destination and a bounded design role.
Astra above high requires a concrete unresolved question, why high is insufficient,
and expected benefit; that condition does not restrict Sol/Luna xhigh roles.
Explicit user model, effort and budget limits remain binding.

Audits have up to three rounds per block; only winning lenses repeat. Continue
ordinary partial coverage with the same auditor via `followup_task`. A Luna
auditor at 400k instead transfers NOT_REACHED to a fresh Sol xhigh auditor on the
same snapshot, lens and round; preserve completed coverage and findings. Ending
the audit game does not close findings or accept the block. See the orchestration
skill's coinciding-conditions table for competing transitions. Use runtime usage
reports when available; `/usage` alone is not proof of a per-block token total.

## Work packet

```text
TASK: identifier, assignment version and durable task-state location
TIER / RUN: worker model and run number on this block (worker)
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: standard | enhanced | economy | custom; explicit | inherited | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: what the user asked for
GOAL: the complete result this block owns
ACCEPTANCE_EXAMPLE: concrete before/after
SCOPE / OUT_OF_SCOPE: what this block covers; what it must not do
PROJECT_RULES: repository instruction files to read first
INPUTS / SNAPSHOT: exact sources, contracts, stable read root, revision and relevant dirty/new files
WRITE_SET / DO_NOT_TOUCH: owned files; exclusions
CHECKS: commands with cwd and expected result
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents may share a checkout when writes and relevant reads stay stable. For an
audit running beside a writer, materialize a stable view including read
dependencies, or serialize them; a revision label or disjoint WRITE_SETs alone
are insufficient. Use a worktree or copied tree when it resolves that conflict.
