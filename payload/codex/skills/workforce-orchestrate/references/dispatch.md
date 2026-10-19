# Routing and the work packet (Codex)

`{{CODEX_HOME}}/codex-workforce/profiles.json` is the routing record; this file
explains it. A model release updates the record, not the workflow. Read both
when you choose a profile or a model for an agent, or fill a packet.

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

| Tier | Tool calls | Attempts | Token ceiling | Next tier |
| --- | --- | --- | --- | --- |
| Luna | 600 per run, 1800 per block | 3 | 400k | Sol xhigh |
| Sol | no cap | 3 | 500k | Astra high |
| Astra | no cap | 3 | none | the cooperator re-plans or asks the user |

An attempt is spent only by a run that ends without a result: the worker hit
its BUDGET, returned `STATUS: handoff`, or its fix left the finding open. A
submitted block, or a fix that closes its finding, spends no attempt. Tool
calls and tokens count for every run on the block, fixes included. Asking a
stopped worker only for its HANDOFF is not a new run. The counters stay with
the block when it is blocked, submitted, handed off, or put aside for another
block.

Tokens: count the new tokens a worker's thread has processed (input minus
cached input, plus output), all its runs together; a continued thread keeps
counting from its previous total. Use the usage the runtime reports for the
agent; when it reports none, go by attempts and tool calls and say so in the
report. These budgets are instructions; Codex does not enforce them.

The next tier gets a fresh spawn: the original block packet, the current
snapshot, the cooperator's APPROACH, and the worker's HANDOFF; nothing else from
earlier runs. Re-planning does not reset spent budget or drop the outcome.

Astra high is the ladder's last tier and the bounded design role. Astra above
high needs a stated unresolved question, why high is not enough, and the
expected benefit; that rule does not limit Sol and Luna roles at xhigh.

Auditors: up to three rounds per block; after round 1 only lenses that won the
last round play again. An auditor that returns `STATUS: partial` or stops early
is continued with `followup_task` on its NOT_REACHED files. A Luna auditor that
reaches 400k on a block hands its lens to a fresh Sol xhigh auditor on the same
snapshot and round, with its NOT_REACHED files; its findings stay with the
cooperator. Report usage from `/usage` when asked.

## Work packet

```text
TASK: identifier and assignment version; task state file (pipeline)
TIER / RUN: worker model; run number and attempts spent on this block (worker)
WORK_CLASS: build | pipeline
PROFILE / PROFILE_SOURCE: standard | enhanced | economy | custom; explicit | inherited | preference | automatic
REQUEST_KIND: analysis | implementation
ROOT / BRANCH: absolute checkout and agreed branch
USER_OUTCOME: what the user asked for
GOAL: the complete result this block owns
ACCEPTANCE_EXAMPLE: concrete before/after
SCOPE / OUT_OF_SCOPE: what this block covers; what it must not do
PROJECT_RULES: repository instruction files to read first
INPUTS / SNAPSHOT: exact sources, contracts, revision, relevant dirty diff; the tree to read
WRITE_SET / DO_NOT_TOUCH: owned files; exclusions
CHECKS: commands with cwd and expected result
RETURN: concise result, evidence, gaps
MODE: block | stage (reviewer)   LENS: docs | task | conventions (auditor)
INDEPENDENCE (reviewer, auditor): required (<rule or request>) | optional (QUESTION: property; place; evidence so far; what it does not answer); what is already fixed; checks already run
FILES / BUDGET (auditor): assigned files; tool calls before returning STATUS: partial
BUDGET (worker on a budgeted tier): tool calls before returning STATUS: handoff
APPROACH / HANDOFF (escalated worker): the cooperator's decision; the previous tier's handoff
```

Agents share the checkout; use worktrees only for a concrete write conflict. An
audit beside a running writer follows step 4 of [delegation](delegation.md).
